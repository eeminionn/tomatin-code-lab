begin;

alter table public.student_progress
  add column if not exists mission_version integer,
  add column if not exists last_event text;

update public.student_progress progress
set mission_version = assignment.mission_version
from public.assignments assignment
where assignment.id = progress.assignment_id
  and progress.mission_version is null;

alter table public.student_progress
  alter column mission_version set not null,
  add constraint student_progress_mission_version_check
    check (mission_version > 0),
  add constraint student_progress_last_event_check
    check (
      last_event is null
      or last_event in (
        'opened',
        'editing',
        'hint_revealed',
        'ran',
        'submitted'
      )
    );

create or replace function public.set_progress_mission_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.mission_version is null then
    select assignment.mission_version into new.mission_version
    from assignments assignment
    where assignment.id = new.assignment_id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_progress_mission_version
on public.student_progress;

create trigger set_progress_mission_version
before insert on public.student_progress
for each row execute function public.set_progress_mission_version();

create or replace function public.migrate_progress_after_changes_requested()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'changes_requested'
    and old.status is distinct from 'changes_requested'
  then
    select mission.current_version into new.mission_version
    from assignments assignment
    join missions mission on mission.id = assignment.mission_id
    where assignment.id = new.assignment_id;
  end if;
  return new;
end;
$$;

drop trigger if exists migrate_progress_after_changes_requested
on public.student_progress;

create trigger migrate_progress_after_changes_requested
before update on public.student_progress
for each row execute function public.migrate_progress_after_changes_requested();

create or replace function public.migrate_open_progress_after_publish()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.current_version is distinct from old.current_version then
    update student_progress progress
    set mission_version = new.current_version
    from assignments assignment
    where progress.assignment_id = assignment.id
      and assignment.mission_id = new.id
      and progress.status in (
        'not_started',
        'in_progress',
        'changes_requested'
      );
  end if;
  return new;
end;
$$;

drop trigger if exists migrate_open_progress_after_publish
on public.missions;

create trigger migrate_open_progress_after_publish
after update of current_version on public.missions
for each row execute function public.migrate_open_progress_after_publish();

alter table public.drafts
  add column if not exists mission_version integer;

update public.drafts draft
set mission_version = coalesce(
  (
    select progress.mission_version
    from public.student_progress progress
    where progress.user_id = draft.user_id
      and progress.assignment_id = draft.assignment_id
    limit 1
  ),
  (
    select mission.current_version
    from public.missions mission
    where mission.id = draft.mission_id
  )
)
where draft.mission_version is null;

alter table public.drafts
  alter column mission_version set not null,
  add constraint drafts_mission_version_check check (mission_version > 0);

alter table public.drafts
  drop constraint if exists drafts_user_id_assignment_id_mission_id_language_key;

alter table public.drafts
  add constraint drafts_versioned_key
  unique nulls not distinct (
    user_id,
    assignment_id,
    mission_id,
    mission_version,
    language
  );

alter table public.reviews
  add column if not exists inline_comments jsonb not null default '[]'::jsonb,
  add column if not exists criteria jsonb not null default '[]'::jsonb,
  add constraint reviews_inline_comments_array_check
    check (jsonb_typeof(inline_comments) = 'array'),
  add constraint reviews_criteria_array_check
    check (jsonb_typeof(criteria) = 'array');

alter table public.notifications
  add column if not exists class_id uuid
    references public.classes(id) on delete cascade,
  add column if not exists assignment_id uuid
    references public.assignments(id) on delete set null,
  add column if not exists attempt_id uuid
    references public.attempts(id) on delete set null,
  add column if not exists review_id uuid
    references public.reviews(id) on delete set null;

update public.notifications notification
set class_id = (
  select membership.class_id
  from public.memberships membership
  where membership.user_id = notification.user_id
    and membership.status = 'active'
  order by membership.joined_at
  limit 1
)
where notification.class_id is null;

drop policy if exists "Users read their notifications"
on public.notifications;

create policy "Users read own notifications and staff read class notifications"
on public.notifications for select
to authenticated
using (
  user_id = auth.uid()
  or (class_id is not null and is_class_staff(class_id))
);

create or replace function public.record_student_activity(
  p_assignment_id uuid,
  p_language text,
  p_event text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_progress student_progress%rowtype;
begin
  if p_language not in ('javascript', 'python', 'cpp') then
    raise exception 'Invalid language.';
  end if;
  if p_event not in (
    'opened',
    'editing',
    'hint_revealed',
    'ran',
    'submitted'
  ) then
    raise exception 'Invalid activity event.';
  end if;

  select * into target_progress
  from student_progress
  where user_id = auth.uid()
    and assignment_id = p_assignment_id
  for update;

  if target_progress.user_id is null then
    raise exception 'Assignment progress not found.';
  end if;

  if p_event = 'editing'
    and target_progress.last_event = 'editing'
    and target_progress.last_activity_at > now() - interval '1 minute'
  then
    return;
  end if;

  update student_progress
  set
    language = p_language,
    last_event = p_event,
    last_activity_at = now(),
    status = case
      when status = 'not_started' then 'in_progress'
      else status
    end
  where user_id = auth.uid()
    and assignment_id = p_assignment_id;
end;
$$;

create or replace function public.record_hint(
  p_assignment_id uuid,
  p_count integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update student_progress
  set
    hints_used = greatest(hints_used, p_count),
    status = case when status = 'not_started' then 'in_progress' else status end,
    last_event = 'hint_revealed',
    last_activity_at = now()
  where user_id = auth.uid()
    and assignment_id = p_assignment_id;
end;
$$;

drop function if exists public.review_submission(uuid, text, text);

create function public.review_submission(
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
    set status = 'changes_requested', last_activity_at = now()
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

grant execute on function public.record_student_activity(uuid, text, text)
to authenticated;

grant execute on function public.review_submission(
  uuid,
  text,
  text,
  jsonb,
  jsonb
) to authenticated;

commit;
