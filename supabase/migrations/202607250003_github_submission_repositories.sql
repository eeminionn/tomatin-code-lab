create table public.student_repositories (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  owner_login text not null check (char_length(owner_login) between 1 and 100),
  repository_name text not null check (char_length(repository_name) between 1 and 100),
  html_url text not null,
  visibility text not null default 'private'
    check (visibility = 'private'),
  status text not null default 'ready'
    check (status in ('ready', 'error')),
  collaborator_status text not null default 'pending'
    check (collaborator_status in ('pending', 'invited', 'active', 'error')),
  last_synced_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, user_id),
  unique (owner_login, repository_name)
);

create table public.submission_repository_syncs (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.attempts(id) on delete cascade,
  repository_id uuid references public.student_repositories(id) on delete set null,
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id text not null references public.missions(id),
  assignment_id uuid references public.assignments(id) on delete set null,
  language text not null check (language in ('javascript', 'python', 'cpp')),
  file_path text,
  status text not null
    check (status in ('pending_setup', 'synced', 'failed', 'skipped')),
  commit_sha text,
  commit_url text,
  error_message text
    check (error_message is null or char_length(error_message) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index submission_repository_syncs_user_created_idx
  on public.submission_repository_syncs(user_id, created_at desc);

create trigger student_repositories_set_updated_at
before update on public.student_repositories
for each row execute function public.set_updated_at();

create trigger submission_repository_syncs_set_updated_at
before update on public.submission_repository_syncs
for each row execute function public.set_updated_at();

alter table public.student_repositories enable row level security;
alter table public.submission_repository_syncs enable row level security;

create policy "Students read their repository and staff read class repositories"
on public.student_repositories for select
to authenticated
using (user_id = auth.uid() or is_class_staff(class_id));

create policy "Students read their syncs and staff read class syncs"
on public.submission_repository_syncs for select
to authenticated
using (user_id = auth.uid() or is_class_staff(class_id));

grant select on public.student_repositories to authenticated;
grant select on public.submission_repository_syncs to authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and (
    new.role is distinct from old.role
    or new.github_login is distinct from old.github_login
    or new.github_id is distinct from old.github_id
  ) then
    raise exception 'Profile role and GitHub identity are managed by authentication.';
  end if;
  return new;
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
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') <> 'github' then
    raise exception 'GitHub authentication is required.';
  end if;

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
  on conflict (class_id, user_id) do update
    set role = 'student', status = 'active';

  update invitations
  set used_at = now(), used_by = auth.uid()
  where id = target.id;

  return target.class_id;
end;
$$;

update public.memberships membership
set status = 'inactive'
from public.profiles profile
where membership.user_id = profile.id
  and membership.role = 'student'
  and profile.github_login is null;
