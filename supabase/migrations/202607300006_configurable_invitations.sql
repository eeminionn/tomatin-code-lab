alter table public.invitations
  add column if not exists max_uses integer not null default 1,
  add column if not exists use_count integer not null default 0,
  add column if not exists revoked_at timestamptz;

update public.invitations
set
  max_uses = greatest(max_uses, 1),
  use_count = case when used_at is null then 0 else 1 end;

alter table public.invitations
  drop constraint if exists invitations_max_uses_check,
  drop constraint if exists invitations_use_count_check,
  add constraint invitations_max_uses_check
    check (max_uses between 1 and 100),
  add constraint invitations_use_count_check
    check (use_count between 0 and max_uses);

create table if not exists private.invitation_tokens (
  invitation_id uuid primary key
    references public.invitations(id) on delete cascade,
  raw_token text not null
    check (raw_token ~ '^[a-f0-9]{36}$'),
  created_at timestamptz not null default now()
);

revoke all on private.invitation_tokens from public, anon, authenticated;
grant all on private.invitation_tokens to service_role;

create table if not exists public.invitation_redemptions (
  invitation_id uuid not null
    references public.invitations(id) on delete cascade,
  class_id uuid not null
    references public.classes(id) on delete cascade,
  user_id uuid not null
    references public.profiles(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (invitation_id, user_id)
);

insert into public.invitation_redemptions (
  invitation_id,
  class_id,
  user_id,
  redeemed_at
)
select
  invitation.id,
  invitation.class_id,
  invitation.used_by,
  coalesce(invitation.used_at, invitation.created_at)
from public.invitations invitation
where invitation.used_by is not null
on conflict (invitation_id, user_id) do nothing;

alter table public.invitation_redemptions enable row level security;

create policy "Members read their invitation redemptions"
on public.invitation_redemptions for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_class_staff(class_id)
);

grant select on public.invitation_redemptions to authenticated;

create or replace function public.create_class_invitation(
  p_label text,
  p_max_uses integer,
  p_expires_at timestamptz
)
returns table (
  id uuid,
  label text,
  token text,
  token_preview text,
  expires_at timestamptz,
  used_at timestamptz,
  max_uses integer,
  use_count integer,
  revoked_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  target_class_id uuid;
  raw_token text;
  created public.invitations%rowtype;
begin
  if char_length(trim(coalesce(p_label, ''))) not between 1 and 80 then
    raise exception 'Invitation label must be between 1 and 80 characters.';
  end if;
  if p_max_uses not between 1 and 100 then
    raise exception 'Invitation capacity must be between 1 and 100.';
  end if;
  if p_expires_at <= now() + interval '5 minutes'
    or p_expires_at > now() + interval '365 days' then
    raise exception 'Invitation expiration must be between 5 minutes and 365 days.';
  end if;

  select membership.class_id into target_class_id
  from public.memberships membership
  where membership.user_id = auth.uid()
    and membership.status = 'active'
    and membership.role in ('owner', 'mentor')
  order by membership.joined_at
  limit 1;

  if target_class_id is null then
    raise exception 'Mentor membership required.';
  end if;

  raw_token := encode(gen_random_bytes(18), 'hex');

  insert into public.invitations (
    class_id,
    label,
    token_hash,
    token_preview,
    expires_at,
    max_uses,
    use_count,
    created_by
  )
  values (
    target_class_id,
    trim(p_label),
    encode(digest(raw_token, 'sha256'), 'hex'),
    right(raw_token, 8),
    p_expires_at,
    p_max_uses,
    0,
    auth.uid()
  )
  returning * into created;

  insert into private.invitation_tokens (invitation_id, raw_token)
  values (created.id, raw_token);

  return query
  select
    created.id,
    created.label,
    raw_token,
    created.token_preview,
    created.expires_at,
    created.used_at,
    created.max_uses,
    created.use_count,
    created.revoked_at;
end;
$$;

create or replace function public.update_class_invitation(
  p_invitation_id uuid,
  p_label text,
  p_max_uses integer,
  p_expires_at timestamptz,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.invitations%rowtype;
begin
  select invitation.* into target
  from public.invitations invitation
  where invitation.id = p_invitation_id
    and public.is_class_staff(invitation.class_id)
  for update;

  if target.id is null then
    raise exception 'Invitation not found or staff access required.';
  end if;
  if char_length(trim(coalesce(p_label, ''))) not between 1 and 80 then
    raise exception 'Invitation label must be between 1 and 80 characters.';
  end if;
  if p_max_uses not between greatest(1, target.use_count) and 100 then
    raise exception 'Invitation capacity cannot be below its current use count.';
  end if;
  if p_active and (
    p_expires_at <= now() + interval '5 minutes'
    or p_expires_at > now() + interval '365 days'
  ) then
    raise exception 'An active invitation must expire between 5 minutes and 365 days.';
  end if;

  update public.invitations
  set
    label = trim(p_label),
    max_uses = p_max_uses,
    expires_at = p_expires_at,
    revoked_at = case
      when p_active then null
      else coalesce(revoked_at, now())
    end,
    used_at = case
      when use_count >= p_max_uses then coalesce(used_at, now())
      else null
    end
  where invitations.id = p_invitation_id;
end;
$$;

create or replace function public.get_invitation_token(
  p_invitation_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  target public.invitations%rowtype;
  raw_token text;
begin
  select invitation.* into target
  from public.invitations invitation
  where invitation.id = p_invitation_id
    and public.is_class_staff(invitation.class_id)
  for update;

  if target.id is null then
    raise exception 'Invitation not found or staff access required.';
  end if;

  select stored.raw_token into raw_token
  from private.invitation_tokens stored
  where stored.invitation_id = target.id;

  if raw_token is null then
    raw_token := encode(gen_random_bytes(18), 'hex');
    update public.invitations
    set
      token_hash = encode(digest(raw_token, 'sha256'), 'hex'),
      token_preview = right(raw_token, 8)
    where invitations.id = target.id;
    insert into private.invitation_tokens (invitation_id, raw_token)
    values (target.id, raw_token);
  end if;

  return raw_token;
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target public.invitations%rowtype;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') <> 'github' then
    raise exception 'GitHub authentication is required.';
  end if;

  select invitation.* into target
  from public.invitations invitation
  where invitation.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and invitation.revoked_at is null
    and invitation.expires_at > now()
  for update;

  if target.id is null then
    raise exception 'Invitation is invalid, revoked, or expired.';
  end if;

  if exists (
    select 1
    from public.memberships membership
    where membership.class_id = target.class_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  ) then
    return target.class_id;
  end if;

  if target.use_count >= target.max_uses then
    raise exception 'Invitation has no remaining seats.';
  end if;

  insert into public.memberships (class_id, user_id, role, status)
  values (target.class_id, auth.uid(), 'student', 'active')
  on conflict (class_id, user_id) do update
  set
    role = case
      when memberships.role in ('owner', 'mentor') then memberships.role
      else 'student'
    end,
    status = 'active';

  insert into public.invitation_redemptions (
    invitation_id,
    class_id,
    user_id
  )
  values (target.id, target.class_id, auth.uid());

  update public.invitations
  set
    use_count = target.use_count + 1,
    used_at = case
      when target.use_count + 1 >= target.max_uses then now()
      else null
    end,
    used_by = case
      when target.max_uses = 1 then auth.uid()
      else used_by
    end
  where invitations.id = target.id;

  return target.class_id;
end;
$$;

grant execute on function public.create_class_invitation(
  text,
  integer,
  timestamptz
) to authenticated;
grant execute on function public.update_class_invitation(
  uuid,
  text,
  integer,
  timestamptz,
  boolean
) to authenticated;
grant execute on function public.get_invitation_token(uuid) to authenticated;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    alter publication supabase_realtime add table public.invitations;
  end if;
exception when duplicate_object then
  null;
end;
$$;
