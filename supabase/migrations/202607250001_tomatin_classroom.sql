create extension if not exists pgcrypto;
create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  email text not null default '',
  github_login text,
  github_id bigint unique,
  avatar_url text,
  role text not null default 'student'
    check (role in ('owner', 'mentor', 'student')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  timezone text not null default 'America/Santiago',
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.memberships (
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'student'
    check (role in ('owner', 'mentor', 'student')),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

create table public.missions (
  id text primary key,
  slug text not null unique,
  course text not null check (course in ('programming-1', 'programming-2')),
  title text not null,
  current_version integer not null default 1 check (current_version > 0),
  archived_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.mission_versions (
  id uuid primary key default gen_random_uuid(),
  mission_id text not null references public.missions(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  content jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (mission_id, version)
);

create table public.mission_variants (
  id uuid primary key default gen_random_uuid(),
  mission_version_id uuid not null references public.mission_versions(id) on delete cascade,
  language text not null check (language in ('javascript', 'python', 'cpp')),
  starter_code text not null check (octet_length(starter_code) <= 65536),
  expected_signature text,
  examples jsonb not null default '[]'::jsonb,
  public_tests jsonb not null default '[]'::jsonb,
  hidden_test_count integer not null default 0 check (hidden_test_count >= 0),
  created_at timestamptz not null default now(),
  unique (mission_version_id, language)
);

create table private.mission_variants_secure (
  variant_id uuid primary key references public.mission_variants(id) on delete cascade,
  reference_solution text not null check (octet_length(reference_solution) <= 65536),
  hidden_tests jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  mission_id text not null references public.missions(id),
  mission_version integer not null check (mission_version > 0),
  title text not null check (char_length(title) between 1 and 120),
  instructions text not null default '',
  due_at timestamptz not null,
  points integer not null check (points between 0 and 10000),
  allowed_languages text[] not null default array['javascript', 'python', 'cpp'],
  student_ids uuid[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (
    allowed_languages <@ array['javascript', 'python', 'cpp']::text[]
    and cardinality(allowed_languages) > 0
  ),
  foreign key (mission_id, mission_version)
    references public.mission_versions(mission_id, version)
);

create table public.student_progress (
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  status text not null default 'not_started'
    check (status in (
      'not_started',
      'in_progress',
      'awaiting_review',
      'changes_requested',
      'approved'
    )),
  language text check (language in ('javascript', 'python', 'cpp')),
  last_activity_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  hints_used integer not null default 0 check (hints_used >= 0),
  primary key (user_id, assignment_id)
);

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  mission_id text not null references public.missions(id),
  language text not null check (language in ('javascript', 'python', 'cpp')),
  code text not null default '' check (octet_length(code) <= 65536),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, assignment_id, mission_id, language)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id text not null references public.missions(id),
  assignment_id uuid references public.assignments(id) on delete set null,
  mission_version integer not null check (mission_version > 0),
  language text not null check (language in ('javascript', 'python', 'cpp')),
  kind text not null check (kind in ('run', 'submit')),
  remote boolean not null default true,
  code text not null check (octet_length(code) <= 65536),
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index attempts_user_created_idx
  on public.attempts(user_id, created_at desc);
create index attempts_assignment_idx
  on public.attempts(assignment_id, created_at desc);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id),
  decision text not null check (decision in ('approved', 'changes_requested', 'comment')),
  comment text not null default '' check (char_length(comment) <= 4000),
  created_at timestamptz not null default now()
);

create table public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  amount integer not null check (amount >= 0),
  reason text not null default 'assignment_approved',
  source_review_id uuid references public.reviews(id),
  created_at timestamptz not null default now(),
  unique (user_id, assignment_id, reason)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  label text not null,
  token_hash text not null unique,
  token_preview text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.is_class_member(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships
    where class_id = target_class_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_class_staff(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships
    where class_id = target_class_id
      and user_id = auth.uid()
      and status = 'active'
      and role in ('owner', 'mentor')
  );
$$;

create or replace function public.shares_class(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships mine
    join memberships theirs on theirs.class_id = mine.class_id
    where mine.user_id = auth.uid()
      and mine.status = 'active'
      and theirs.user_id = target_user_id
      and theirs.status = 'active'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger drafts_set_updated_at
before update on public.drafts
for each row execute function public.set_updated_at();

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.role <> old.role then
    raise exception 'Profile roles can only be changed by a classroom owner.';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_login text;
  user_github_id bigint;
  user_role text;
  classroom_id uuid;
begin
  user_login := coalesce(
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username'
  );
  begin
    user_github_id := nullif(
      coalesce(
        new.raw_user_meta_data ->> 'provider_id',
        new.raw_user_meta_data ->> 'sub'
      ),
      ''
    )::bigint;
  exception when invalid_text_representation then
    user_github_id := null;
  end;

  user_role := case
    when lower(coalesce(user_login, '')) = 'eeminionn'
      or user_github_id = 109454414
      then 'owner'
    else 'student'
  end;

  insert into profiles (
    id,
    display_name,
    email,
    github_login,
    github_id,
    avatar_url,
    role
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      user_login,
      split_part(coalesce(new.email, 'Estudiante'), '@', 1)
    ),
    coalesce(new.email, ''),
    user_login,
    user_github_id,
    new.raw_user_meta_data ->> 'avatar_url',
    user_role
  )
  on conflict (id) do nothing;

  if user_role = 'owner' then
    select id into classroom_id
    from classes
    where owner_id = new.id
    limit 1;

    if classroom_id is null then
      insert into classes (name, timezone, owner_id)
      values ('Tomatin Code Lab', 'America/Santiago', new.id)
      returning id into classroom_id;
    end if;

    insert into memberships (class_id, user_id, role, status)
    values (classroom_id, new.id, 'owner', 'active')
    on conflict (class_id, user_id) do update
      set role = excluded.role, status = 'active';
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (
  id,
  display_name,
  email,
  github_login,
  github_id,
  avatar_url,
  role
)
select
  user_record.id,
  coalesce(
    user_record.raw_user_meta_data ->> 'full_name',
    user_record.raw_user_meta_data ->> 'name',
    user_record.raw_user_meta_data ->> 'user_name',
    split_part(coalesce(user_record.email, 'Estudiante'), '@', 1)
  ),
  coalesce(user_record.email, ''),
  user_record.raw_user_meta_data ->> 'user_name',
  case
    when coalesce(
      user_record.raw_user_meta_data ->> 'provider_id',
      user_record.raw_user_meta_data ->> 'sub',
      ''
    ) ~ '^[0-9]+$'
    then coalesce(
      user_record.raw_user_meta_data ->> 'provider_id',
      user_record.raw_user_meta_data ->> 'sub'
    )::bigint
    else null
  end,
  user_record.raw_user_meta_data ->> 'avatar_url',
  case
    when lower(coalesce(user_record.raw_user_meta_data ->> 'user_name', '')) = 'eeminionn'
      or coalesce(
        user_record.raw_user_meta_data ->> 'provider_id',
        user_record.raw_user_meta_data ->> 'sub',
        ''
      ) = '109454414'
      then 'owner'
    else 'student'
  end
from auth.users user_record
on conflict (id) do nothing;

do $$
declare
  owner_user_id uuid;
  classroom_id uuid;
begin
  select id into owner_user_id
  from public.profiles
  where role = 'owner'
  order by created_at
  limit 1;

  if owner_user_id is not null then
    select id into classroom_id
    from public.classes
    where owner_id = owner_user_id
    limit 1;

    if classroom_id is null then
      insert into public.classes (name, timezone, owner_id)
      values ('Tomatin Code Lab', 'America/Santiago', owner_user_id)
      returning id into classroom_id;
    end if;

    insert into public.memberships (class_id, user_id, role, status)
    values (classroom_id, owner_user_id, 'owner', 'active')
    on conflict (class_id, user_id) do update
      set role = excluded.role, status = 'active';
  end if;
end;
$$;

create or replace function public.create_assignment(
  p_mission_id text,
  p_title text,
  p_instructions text,
  p_due_at timestamptz,
  p_points integer,
  p_allowed_languages text[],
  p_student_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  classroom_id uuid;
  assignment_id uuid;
  selected_version integer;
begin
  select m.class_id into classroom_id
  from memberships m
  where m.user_id = auth.uid()
    and m.status = 'active'
    and m.role in ('owner', 'mentor')
  limit 1;

  if classroom_id is null then
    raise exception 'Mentor membership required.';
  end if;

  select current_version into selected_version
  from missions
  where id = p_mission_id;

  if selected_version is null then
    raise exception 'Mission not found.';
  end if;

  if exists (
    select 1 from unnest(p_student_ids) selected_student
    where not exists (
      select 1 from memberships class_membership
      where class_membership.class_id = classroom_id
        and class_membership.user_id = selected_student
        and class_membership.role = 'student'
        and class_membership.status = 'active'
    )
  ) then
    raise exception 'Every assignee must be an active student in the class.';
  end if;

  insert into assignments (
    class_id,
    mission_id,
    mission_version,
    title,
    instructions,
    due_at,
    points,
    allowed_languages,
    student_ids,
    status,
    created_by
  )
  values (
    classroom_id,
    p_mission_id,
    selected_version,
    p_title,
    coalesce(p_instructions, ''),
    p_due_at,
    p_points,
    p_allowed_languages,
    p_student_ids,
    'published',
    auth.uid()
  )
  returning id into assignment_id;

  insert into student_progress (class_id, user_id, assignment_id)
  select classroom_id, student_id, assignment_id
  from unnest(p_student_ids) student_id;

  return assignment_id;
end;
$$;

create or replace function public.review_submission(
  p_attempt_id uuid,
  p_decision text,
  p_comment text
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

  insert into reviews (attempt_id, mentor_id, decision, comment)
  values (p_attempt_id, auth.uid(), p_decision, coalesce(p_comment, ''))
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

  insert into notifications (user_id, title, body)
  values (
    target_attempt.user_id,
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

create or replace function public.create_invitations(p_count integer)
returns table (
  id uuid,
  label text,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_class_id uuid;
  existing_count integer;
  position integer;
  raw_token text;
  invitation_id uuid;
  invitation_label text;
  expiration timestamptz := now() + interval '7 days';
begin
  if p_count < 1 or p_count > 20 then
    raise exception 'Invitation count must be between 1 and 20.';
  end if;

  select m.class_id into target_class_id
  from memberships m
  where m.user_id = auth.uid()
    and m.status = 'active'
    and m.role in ('owner', 'mentor')
  limit 1;

  if target_class_id is null then
    raise exception 'Mentor membership required.';
  end if;

  select count(*) into existing_count
  from invitations invitation
  where invitation.class_id = target_class_id;

  for position in 1..p_count loop
    raw_token := encode(gen_random_bytes(18), 'hex');
    invitation_label := 'Invitación ' || (existing_count + position);

    insert into invitations (
      class_id,
      label,
      token_hash,
      token_preview,
      expires_at,
      created_by
    )
    values (
      target_class_id,
      invitation_label,
      encode(digest(raw_token, 'sha256'), 'hex'),
      right(raw_token, 8),
      expiration,
      auth.uid()
    )
    returning invitations.id into invitation_id;

    id := invitation_id;
    label := invitation_label;
    token := raw_token;
    expires_at := expiration;
    return next;
  end loop;
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target invitations%rowtype;
begin
  select * into target
  from invitations
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and used_at is null
    and expires_at > now()
  for update;

  if target.id is null then
    raise exception 'Invitation is invalid or expired.';
  end if;

  insert into memberships (class_id, user_id, role, status)
  values (target.class_id, auth.uid(), 'student', 'active')
  on conflict (class_id, user_id) do update set status = 'active';

  update invitations
  set used_at = now(), used_by = auth.uid()
  where id = target.id;

  return target.class_id;
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
    last_activity_at = now()
  where user_id = auth.uid()
    and assignment_id = p_assignment_id;
end;
$$;

create or replace function public.publish_mission_version(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_version mission_versions%rowtype;
  target_title text;
  target_slug text;
  target_course text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required.';
  end if;

  select * into target_version
  from mission_versions
  where id = p_version_id
  for update;

  if target_version.id is null or target_version.status <> 'draft' then
    raise exception 'Draft mission version not found.';
  end if;
  if (
    select count(*) from mission_variants
    where mission_version_id = p_version_id
  ) <> 3 then
    raise exception 'Three language variants are required.';
  end if;
  if (
    select count(*)
    from mission_variants variant
    join private.mission_variants_secure secure
      on secure.variant_id = variant.id
    where variant.mission_version_id = p_version_id
  ) <> 3 then
    raise exception 'Secure reference data is incomplete.';
  end if;

  target_title := target_version.content ->> 'title';
  target_slug := target_version.content ->> 'slug';
  target_course := target_version.content ->> 'course';

  update mission_versions
  set status = 'archived'
  where mission_id = target_version.mission_id
    and status = 'published';

  update mission_versions
  set status = 'published', published_at = now()
  where id = p_version_id;

  update missions
  set
    current_version = target_version.version,
    title = coalesce(target_title, title),
    slug = coalesce(target_slug, slug),
    course = coalesce(target_course, course)
  where id = target_version.mission_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.memberships enable row level security;
alter table public.missions enable row level security;
alter table public.mission_versions enable row level security;
alter table public.mission_variants enable row level security;
alter table public.assignments enable row level security;
alter table public.student_progress enable row level security;
alter table public.drafts enable row level security;
alter table public.attempts enable row level security;
alter table public.reviews enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.notifications enable row level security;
alter table public.invitations enable row level security;

create policy "Profiles are visible inside a class"
on public.profiles for select
to authenticated
using (id = auth.uid() or shares_class(id));

create policy "Users update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Members read their classes"
on public.classes for select
to authenticated
using (is_class_member(id));

create policy "Staff update their classes"
on public.classes for update
to authenticated
using (is_class_staff(id))
with check (is_class_staff(id));

create policy "Members read memberships"
on public.memberships for select
to authenticated
using (is_class_member(class_id));

create policy "Authenticated users read mission catalog"
on public.missions for select
to authenticated
using (true);

create policy "Published mission versions are readable"
on public.mission_versions for select
to authenticated
using (
  status = 'published'
  or exists (select 1 from memberships where user_id = auth.uid() and role in ('owner', 'mentor'))
);

create policy "Published variants are readable"
on public.mission_variants for select
to authenticated
using (
  exists (
    select 1 from mission_versions version
    where version.id = mission_version_id
      and (
        version.status = 'published'
        or exists (
          select 1 from memberships
          where user_id = auth.uid() and role in ('owner', 'mentor')
        )
      )
  )
);

create policy "Students read assigned work and staff read class work"
on public.assignments for select
to authenticated
using (
  is_class_staff(class_id)
  or (
    is_class_member(class_id)
    and auth.uid() = any(student_ids)
    and status = 'published'
  )
);

create policy "Staff manage assignments"
on public.assignments for all
to authenticated
using (is_class_staff(class_id))
with check (is_class_staff(class_id));

create policy "Students read own progress and staff read class progress"
on public.student_progress for select
to authenticated
using (user_id = auth.uid() or is_class_staff(class_id));

create policy "Students manage their drafts"
on public.drafts for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Students read own attempts and staff read class attempts"
on public.attempts for select
to authenticated
using (user_id = auth.uid() or (class_id is not null and is_class_staff(class_id)));

create policy "Students record local practice runs"
on public.attempts for insert
to authenticated
with check (user_id = auth.uid() and kind = 'run' and remote = false);

create policy "Students read reviews on own attempts"
on public.reviews for select
to authenticated
using (
  exists (
    select 1 from attempts attempt
    where attempt.id = attempt_id
      and (
        attempt.user_id = auth.uid()
        or (attempt.class_id is not null and is_class_staff(attempt.class_id))
      )
  )
);

create policy "Staff read class XP and students read their XP"
on public.xp_ledger for select
to authenticated
using (user_id = auth.uid() or is_class_member(class_id));

create policy "Users read their notifications"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

create policy "Users mark their notifications read"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Staff read invitations"
on public.invitations for select
to authenticated
using (is_class_staff(class_id));

revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
grant usage on schema private to service_role;
grant all on all tables in schema private to service_role;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    alter publication supabase_realtime add table
      public.student_progress,
      public.attempts,
      public.reviews,
      public.notifications;
  end if;
exception when duplicate_object then
  null;
end;
$$;

grant usage on schema public to authenticated;
grant select on public.profiles, public.classes, public.memberships to authenticated;
grant select on public.missions, public.mission_versions, public.mission_variants to authenticated;
grant select on public.assignments, public.student_progress, public.attempts to authenticated;
grant select on public.drafts to authenticated;
grant select on public.reviews, public.xp_ledger, public.notifications, public.invitations to authenticated;
grant insert, update, delete on public.drafts to authenticated;
grant insert on public.attempts to authenticated;
grant update on public.profiles, public.classes, public.notifications to authenticated;
grant insert, update, delete on public.assignments to authenticated;
grant execute on function public.create_assignment(text, text, text, timestamptz, integer, text[], uuid[]) to authenticated;
grant execute on function public.review_submission(uuid, text, text) to authenticated;
grant execute on function public.create_invitations(integer) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.record_hint(uuid, integer) to authenticated;
revoke all on function public.publish_mission_version(uuid) from public, anon, authenticated;
grant execute on function public.publish_mission_version(uuid) to service_role;
