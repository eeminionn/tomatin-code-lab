alter table public.profiles
  add column if not exists avatar_config jsonb;

alter table public.profiles
  drop constraint if exists profiles_avatar_config_object_check,
  add constraint profiles_avatar_config_object_check
    check (
      avatar_config is null
      or (
        jsonb_typeof(avatar_config) = 'object'
        and octet_length(avatar_config::text) <= 4096
      )
    );

alter table public.notifications
  add column if not exists dismissed_at timestamptz;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and (
    new.role is distinct from old.role
    or new.email is distinct from old.email
    or new.github_login is distinct from old.github_login
    or new.github_id is distinct from old.github_id
    or new.avatar_url is distinct from old.avatar_url
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Profile identity fields cannot be changed by the user.';
  end if;
  return new;
end;
$$;

revoke update on public.notifications from authenticated;
grant update (read_at, dismissed_at) on public.notifications to authenticated;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
exception when duplicate_object then
  null;
end;
$$;
