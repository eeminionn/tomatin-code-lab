create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 1200),
  price_xp integer not null check (price_xp between 1 and 100000),
  image_path text check (
    image_path is null
    or (
      char_length(image_path) between 1 and 500
      and image_path !~ '(^|/)\.\.(/|$)'
    )
  ),
  stock integer check (stock is null or stock >= 0),
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rewards_class_active_idx
  on public.rewards(class_id, active, created_at desc);

create trigger rewards_set_updated_at
before update on public.rewards
for each row execute function public.set_updated_at();

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid references public.rewards(id) on delete set null,
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_title text not null check (char_length(reward_title) between 1 and 100),
  reward_image_path text,
  cost_xp integer not null check (cost_xp > 0),
  status text not null default 'requested'
    check (status in ('requested', 'fulfilled', 'cancelled')),
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  check (
    (status = 'requested' and fulfilled_at is null and cancelled_at is null)
    or (status = 'fulfilled' and fulfilled_at is not null and cancelled_at is null)
    or (status = 'cancelled' and cancelled_at is not null)
  )
);

create index reward_redemptions_user_created_idx
  on public.reward_redemptions(user_id, created_at desc);
create index reward_redemptions_class_status_idx
  on public.reward_redemptions(class_id, status, created_at desc);

create table public.assignment_github_notifications (
  assignment_id uuid primary key references public.assignments(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'partial', 'failed')),
  mentioned_logins text[] not null default '{}',
  missing_user_ids uuid[] not null default '{}',
  github_comment_id bigint,
  github_comment_url text,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text check (char_length(last_error) <= 2000),
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

create index assignment_github_notifications_class_idx
  on public.assignment_github_notifications(class_id, updated_at desc);

create trigger assignment_github_notifications_set_updated_at
before update on public.assignment_github_notifications
for each row execute function public.set_updated_at();

create or replace function public.available_xp(
  p_user_id uuid,
  p_class_id uuid
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  balance integer;
begin
  if auth.role() <> 'service_role'
    and p_user_id <> auth.uid()
    and not public.is_class_staff(p_class_id) then
    raise exception 'Cannot read another student balance.';
  end if;
  if auth.role() <> 'service_role'
    and not public.is_class_member(p_class_id) then
    raise exception 'Active class membership required.';
  end if;

  select greatest(
    coalesce((
      select sum(ledger.amount)
      from xp_ledger ledger
      where ledger.user_id = p_user_id
        and ledger.class_id = p_class_id
    ), 0)
    - coalesce((
      select sum(redemption.cost_xp)
      from reward_redemptions redemption
      where redemption.user_id = p_user_id
        and redemption.class_id = p_class_id
        and redemption.status in ('requested', 'fulfilled')
    ), 0),
    0
  )::integer into balance;

  return balance;
end;
$$;

create or replace function public.redeem_reward(p_reward_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_reward rewards%rowtype;
  redemption_id uuid;
  current_balance integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

  select * into target_reward
  from rewards
  where id = p_reward_id
  for update;

  if target_reward.id is null or not target_reward.active then
    raise exception 'Reward is not available.';
  end if;
  if not exists (
    select 1
    from memberships membership
    where membership.class_id = target_reward.class_id
      and membership.user_id = auth.uid()
      and membership.role = 'student'
      and membership.status = 'active'
  ) then
    raise exception 'Active student membership required.';
  end if;
  if target_reward.stock is not null and target_reward.stock <= 0 then
    raise exception 'Reward is out of stock.';
  end if;

  current_balance := public.available_xp(auth.uid(), target_reward.class_id);
  if current_balance < target_reward.price_xp then
    raise exception 'Insufficient XP.';
  end if;

  insert into reward_redemptions (
    reward_id,
    class_id,
    user_id,
    reward_title,
    reward_image_path,
    cost_xp
  ) values (
    target_reward.id,
    target_reward.class_id,
    auth.uid(),
    target_reward.title,
    target_reward.image_path,
    target_reward.price_xp
  ) returning id into redemption_id;

  if target_reward.stock is not null then
    update rewards
    set stock = stock - 1
    where id = target_reward.id;
  end if;

  return redemption_id;
end;
$$;

create or replace function public.update_reward_redemption_status(
  p_redemption_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_redemption reward_redemptions%rowtype;
begin
  if p_status not in ('fulfilled', 'cancelled') then
    raise exception 'Invalid redemption status.';
  end if;

  select * into target_redemption
  from reward_redemptions
  where id = p_redemption_id
  for update;

  if target_redemption.id is null
    or not public.is_class_staff(target_redemption.class_id) then
    raise exception 'Class staff membership required.';
  end if;
  if target_redemption.status <> 'requested' then
    raise exception 'Only requested redemptions can be updated.';
  end if;

  if p_status = 'fulfilled' then
    update reward_redemptions
    set status = 'fulfilled', fulfilled_at = now(), cancelled_at = null
    where id = p_redemption_id;
  else
    update reward_redemptions
    set status = 'cancelled', fulfilled_at = null, cancelled_at = now()
    where id = p_redemption_id;

    update rewards
    set stock = stock + 1
    where id = target_redemption.reward_id
      and stock is not null;
  end if;
end;
$$;

create or replace function public.dismiss_notifications(
  p_notification_ids uuid[] default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;
  if p_notification_ids is not null and cardinality(p_notification_ids) > 1000 then
    raise exception 'At most 1000 notifications can be dismissed at once.';
  end if;

  update notifications
  set dismissed_at = now()
  where user_id = auth.uid()
    and dismissed_at is null
    and (p_notification_ids is null or id = any(p_notification_ids));

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

create or replace function public.claim_assignment_github_notification(
  p_assignment_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_class_id uuid;
  inserted_count integer;
  delivery assignment_github_notifications%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required.';
  end if;

  select class_id into target_class_id
  from assignments
  where id = p_assignment_id;
  if target_class_id is null then
    raise exception 'Assignment not found.';
  end if;

  insert into assignment_github_notifications (
    assignment_id,
    class_id,
    status,
    attempts
  ) values (
    p_assignment_id,
    target_class_id,
    'pending',
    1
  ) on conflict (assignment_id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 1 then
    return true;
  end if;

  select * into delivery
  from assignment_github_notifications
  where assignment_id = p_assignment_id
  for update;

  if delivery.github_comment_id is not null
    or delivery.status in ('sent', 'partial') then
    return false;
  end if;
  if delivery.status = 'pending'
    and delivery.updated_at > now() - interval '5 minutes' then
    return false;
  end if;

  update assignment_github_notifications
  set status = 'pending', attempts = attempts + 1, last_error = null
  where assignment_id = p_assignment_id;
  return true;
end;
$$;

alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.assignment_github_notifications enable row level security;

create policy "Members read active rewards and staff read all rewards"
on public.rewards for select
to authenticated
using (
  public.is_class_staff(class_id)
  or (active and public.is_class_member(class_id))
);

create policy "Staff manage rewards"
on public.rewards for all
to authenticated
using (public.is_class_staff(class_id))
with check (public.is_class_staff(class_id));

create policy "Students read own redemptions and staff read class redemptions"
on public.reward_redemptions for select
to authenticated
using (user_id = auth.uid() or public.is_class_staff(class_id));

create policy "Staff read assignment GitHub notification state"
on public.assignment_github_notifications for select
to authenticated
using (public.is_class_staff(class_id));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'reward-images',
  'reward-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Reward images are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'reward-images');

create policy "Class staff upload reward images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'reward-images'
  and exists (
    select 1
    from public.memberships membership
    where membership.class_id::text = (storage.foldername(name))[1]
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role in ('owner', 'mentor')
  )
);

create policy "Class staff update reward images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'reward-images'
  and exists (
    select 1
    from public.memberships membership
    where membership.class_id::text = (storage.foldername(name))[1]
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role in ('owner', 'mentor')
  )
)
with check (
  bucket_id = 'reward-images'
  and exists (
    select 1
    from public.memberships membership
    where membership.class_id::text = (storage.foldername(name))[1]
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role in ('owner', 'mentor')
  )
);

create policy "Class staff delete reward images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'reward-images'
  and exists (
    select 1
    from public.memberships membership
    where membership.class_id::text = (storage.foldername(name))[1]
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role in ('owner', 'mentor')
  )
);

grant select, insert, update, delete on public.rewards to authenticated;
grant select on public.reward_redemptions to authenticated;
grant select on public.assignment_github_notifications to authenticated;
grant all on public.rewards, public.reward_redemptions,
  public.assignment_github_notifications to service_role;

revoke all on function public.available_xp(uuid, uuid) from public, anon;
grant execute on function public.available_xp(uuid, uuid) to authenticated, service_role;
revoke all on function public.redeem_reward(uuid) from public, anon;
grant execute on function public.redeem_reward(uuid) to authenticated;
revoke all on function public.update_reward_redemption_status(uuid, text)
  from public, anon;
grant execute on function public.update_reward_redemption_status(uuid, text)
  to authenticated;
revoke all on function public.dismiss_notifications(uuid[]) from public, anon;
grant execute on function public.dismiss_notifications(uuid[]) to authenticated;
revoke all on function public.claim_assignment_github_notification(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_assignment_github_notification(uuid)
  to service_role;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    alter publication supabase_realtime add table
      public.rewards,
      public.reward_redemptions,
      public.assignment_github_notifications;
  end if;
exception when duplicate_object then
  null;
end;
$$;
