-- Fork owners: replace this numeric GitHub ID before the first deployment.
-- Find it at https://api.github.com/users/YOUR_GITHUB_USERNAME.
create table private.app_configuration (
  singleton boolean primary key default true check (singleton),
  owner_github_id bigint not null
);

revoke all on private.app_configuration from public, anon, authenticated;

insert into private.app_configuration (singleton, owner_github_id)
values (true, 109454414)
on conflict (singleton) do update
set owner_github_id = excluded.owner_github_id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_login text;
  user_github_id bigint;
  configured_owner_github_id bigint;
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

  select owner_github_id into configured_owner_github_id
  from private.app_configuration
  where singleton = true;

  user_role := case
    when user_github_id = configured_owner_github_id then 'owner'
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

update public.profiles
set role = 'owner'
where github_id = (
  select owner_github_id
  from private.app_configuration
  where singleton = true
);
