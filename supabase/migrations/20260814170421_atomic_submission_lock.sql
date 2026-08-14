begin;

alter table public.student_progress
  add column submitted_attempt_id uuid
  references public.attempts(id) on delete set null;

with latest_submission as (
  select distinct on (progress.user_id, progress.assignment_id)
    progress.user_id,
    progress.assignment_id,
    attempt.id as attempt_id
  from public.student_progress progress
  join public.attempts attempt
    on attempt.user_id = progress.user_id
    and attempt.assignment_id = progress.assignment_id
    and attempt.kind = 'submit'
    and attempt.result ->> 'status' = 'passed'
  where progress.status in ('awaiting_review', 'approved')
  order by
    progress.user_id,
    progress.assignment_id,
    attempt.created_at desc,
    attempt.id desc
)
update public.student_progress progress
set submitted_attempt_id = latest_submission.attempt_id
from latest_submission
where progress.user_id = latest_submission.user_id
  and progress.assignment_id = latest_submission.assignment_id;

create unique index student_progress_active_submission_idx
  on public.student_progress(submitted_attempt_id)
  where submitted_attempt_id is not null;

create function public.record_remote_attempt(
  p_user_id uuid,
  p_class_id uuid,
  p_assignment_id uuid,
  p_mission_id text,
  p_mission_version integer,
  p_language text,
  p_kind text,
  p_code text,
  p_result jsonb
)
returns table (
  attempt_id uuid,
  attempt_created_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_assignment public.assignments%rowtype;
  target_progress public.student_progress%rowtype;
  new_attempt public.attempts%rowtype;
  has_progress boolean := false;
  is_staff boolean := false;
  passed boolean := coalesce(p_result ->> 'status', '') = 'passed';
begin
  if p_language not in ('javascript', 'python', 'cpp') then
    raise exception 'Lenguaje no válido.';
  end if;
  if p_kind not in ('run', 'submit') then
    raise exception 'Tipo de intento no válido.';
  end if;
  if p_mission_version < 1 then
    raise exception 'Versión de misión no válida.';
  end if;
  if octet_length(p_code) > 65536 then
    raise exception 'El código supera 64 KB.';
  end if;
  if jsonb_typeof(p_result) is distinct from 'object' then
    raise exception 'Resultado de ejecución no válido.';
  end if;

  if p_assignment_id is not null then
    select assignment.* into target_assignment
    from public.assignments assignment
    where assignment.id = p_assignment_id;

    if target_assignment.id is null then
      raise exception 'Tarea no encontrada.';
    end if;
    if target_assignment.class_id is distinct from p_class_id
      or target_assignment.mission_id is distinct from p_mission_id
      or target_assignment.status <> 'published'
      or not (p_language = any(target_assignment.allowed_languages))
    then
      raise exception 'Tarea o lenguaje no disponible.';
    end if;

    select progress.* into target_progress
    from public.student_progress progress
    where progress.user_id = p_user_id
      and progress.assignment_id = p_assignment_id
    for update;
    has_progress := found;

    if has_progress then
      if target_progress.class_id is distinct from target_assignment.class_id
        or target_progress.mission_version is distinct from p_mission_version
        or not (p_user_id = any(target_assignment.student_ids))
      then
        raise exception 'La tarea asignada no coincide con el progreso.';
      end if;

      if p_kind = 'submit' and target_progress.status = 'awaiting_review' then
        raise exception 'Tu entrega ya está esperando revisión del mentor.';
      end if;
      if p_kind = 'submit' and target_progress.status = 'approved' then
        raise exception 'Esta tarea ya fue aprobada.';
      end if;
    else
      select exists (
        select 1
        from public.memberships membership
        where membership.class_id = target_assignment.class_id
          and membership.user_id = p_user_id
          and membership.status = 'active'
          and membership.role in ('owner', 'mentor')
      ) into is_staff;
      if not is_staff then
        raise exception 'No se encontró el progreso de esta tarea.';
      end if;
    end if;
  elsif p_class_id is not null then
    if not exists (
      select 1
      from public.memberships membership
      where membership.class_id = p_class_id
        and membership.user_id = p_user_id
        and membership.status = 'active'
    ) then
      raise exception 'No tienes acceso a esta clase.';
    end if;
  end if;

  insert into public.attempts (
    class_id,
    user_id,
    mission_id,
    assignment_id,
    mission_version,
    language,
    kind,
    remote,
    code,
    result
  )
  values (
    p_class_id,
    p_user_id,
    p_mission_id,
    p_assignment_id,
    p_mission_version,
    p_language,
    p_kind,
    true,
    p_code,
    p_result
  )
  returning * into new_attempt;

  if has_progress then
    update public.student_progress
    set
      status = case
        when p_kind = 'submit' and passed then 'awaiting_review'
        when status = 'not_started' then 'in_progress'
        else status
      end,
      language = p_language,
      last_event = case
        when p_kind = 'submit' and passed then 'submitted'
        else 'ran'
      end,
      last_activity_at = new_attempt.created_at,
      submitted_at = case
        when p_kind = 'submit' and passed then new_attempt.created_at
        else submitted_at
      end,
      submitted_attempt_id = case
        when p_kind = 'submit' and passed then new_attempt.id
        else submitted_attempt_id
      end,
      attempts = attempts + 1
    where user_id = p_user_id
      and assignment_id = p_assignment_id;
  end if;

  return query
  select new_attempt.id, new_attempt.created_at;
end;
$$;

revoke all on function public.record_remote_attempt(
  uuid,
  uuid,
  uuid,
  text,
  integer,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.record_remote_attempt(
  uuid,
  uuid,
  uuid,
  text,
  integer,
  text,
  text,
  text,
  jsonb
) to service_role;

create or replace function public.review_submission(
  p_attempt_id uuid,
  p_decision text,
  p_comment text,
  p_inline_comments jsonb default '[]'::jsonb,
  p_criteria jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt attempts%rowtype;
  target_assignment assignments%rowtype;
  target_progress student_progress%rowtype;
  review_id uuid;
begin
  if p_decision not in ('approved', 'changes_requested', 'comment') then
    raise exception 'Invalid review decision.';
  end if;
  if octet_length(coalesce(p_comment, '')) > 10000 then
    raise exception 'Review comment is too long.';
  end if;
  if coalesce(jsonb_typeof(p_inline_comments), 'null') <> 'array'
    or coalesce(jsonb_typeof(p_criteria), 'null') <> 'array' then
    raise exception 'Invalid review details.';
  end if;
  if jsonb_array_length(p_inline_comments) > 50
    or octet_length(p_inline_comments::text) > 20000
    or jsonb_array_length(p_criteria) > 20
    or octet_length(p_criteria::text) > 10000 then
    raise exception 'Review details are too large.';
  end if;

  select * into target_attempt from attempts where id = p_attempt_id;
  if target_attempt.id is null or target_attempt.assignment_id is null then
    raise exception 'Assignment submission not found.';
  end if;
  if target_attempt.kind <> 'submit'
    or coalesce(target_attempt.result ->> 'status', '') <> 'passed' then
    raise exception 'Only passing submissions can enter review.';
  end if;
  if not is_class_staff(target_attempt.class_id) then
    raise exception 'Mentor membership required.';
  end if;

  select * into target_assignment
  from assignments
  where id = target_attempt.assignment_id;

  select * into target_progress
  from student_progress
  where user_id = target_attempt.user_id
    and assignment_id = target_attempt.assignment_id
  for update;

  if p_decision <> 'comment' then
    if target_progress.user_id is null
      or target_progress.status <> 'awaiting_review'
    then
      raise exception 'Esta entrega ya no está esperando revisión.';
    end if;
    if target_progress.submitted_attempt_id is distinct from p_attempt_id then
      raise exception 'Esta no es la entrega activa del estudiante.';
    end if;
  end if;

  insert into reviews (
    attempt_id,
    mentor_id,
    decision,
    comment,
    inline_comments,
    criteria
  )
  values (
    p_attempt_id,
    auth.uid(),
    p_decision,
    coalesce(p_comment, ''),
    p_inline_comments,
    p_criteria
  )
  returning id into review_id;

  if p_decision = 'approved' then
    update student_progress
    set status = 'approved', approved_at = now(), last_activity_at = now()
    where user_id = target_attempt.user_id
      and assignment_id = target_attempt.assignment_id;

    insert into xp_ledger (
      class_id,
      user_id,
      assignment_id,
      amount,
      source_review_id
    )
    values (
      target_attempt.class_id,
      target_attempt.user_id,
      target_attempt.assignment_id,
      target_assignment.points,
      review_id
    )
    on conflict (user_id, assignment_id, reason) do nothing;
  elsif p_decision = 'changes_requested' then
    update student_progress
    set
      status = 'changes_requested',
      submitted_attempt_id = null,
      last_activity_at = now()
    where user_id = target_attempt.user_id
      and assignment_id = target_attempt.assignment_id;
  end if;

  insert into notifications (
    user_id,
    class_id,
    assignment_id,
    attempt_id,
    review_id,
    title,
    body
  )
  values (
    target_attempt.user_id,
    target_attempt.class_id,
    target_attempt.assignment_id,
    target_attempt.id,
    review_id,
    case p_decision
      when 'approved' then 'Entrega aprobada'
      when 'changes_requested' then 'Hay cambios solicitados'
      else 'Nuevo comentario'
    end,
    coalesce(nullif(p_comment, ''), 'Tu mentor revisó la entrega.')
  );

  return review_id;
end;
$$;

commit;
