begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  (
    '10000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'rewards-owner@test.local', '',
    now(), '{}', '{"user_name":"rewards-owner","provider_id":"9101"}',
    now(), now()
  ),
  (
    '10000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'rewards-one@test.local', '',
    now(), '{}', '{"user_name":"rewards-one","provider_id":"9102"}',
    now(), now()
  ),
  (
    '10000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'rewards-two@test.local', '',
    now(), '{}', '{"user_name":"rewards-two","provider_id":"9103"}',
    now(), now()
  );

insert into public.classes (id, name, owner_id)
values (
  '10000000-0000-0000-0000-000000000201',
  'Rewards Test Class',
  '10000000-0000-0000-0000-000000000101'
);

insert into public.memberships (class_id, user_id, role)
values
  (
    '10000000-0000-0000-0000-000000000201',
    '10000000-0000-0000-0000-000000000101',
    'owner'
  ),
  (
    '10000000-0000-0000-0000-000000000201',
    '10000000-0000-0000-0000-000000000102',
    'student'
  ),
  (
    '10000000-0000-0000-0000-000000000201',
    '10000000-0000-0000-0000-000000000103',
    'student'
  );

insert into public.assignments (
  id, class_id, mission_id, mission_version, title, due_at, points,
  student_ids, status, created_by
)
values (
  '10000000-0000-0000-0000-000000000301',
  '10000000-0000-0000-0000-000000000201',
  'p1-01-la-once',
  3,
  'Rewards test assignment',
  now() + interval '1 day',
  150,
  array['10000000-0000-0000-0000-000000000102'::uuid],
  'published',
  '10000000-0000-0000-0000-000000000101'
);

insert into public.xp_ledger (
  class_id, user_id, assignment_id, amount
)
values (
  '10000000-0000-0000-0000-000000000201',
  '10000000-0000-0000-0000-000000000102',
  '10000000-0000-0000-0000-000000000301',
  150
);

insert into public.rewards (
  id, class_id, title, description, price_xp, stock, active, created_by
)
values
  (
    '10000000-0000-0000-0000-000000000401',
    '10000000-0000-0000-0000-000000000201',
    'Premio disponible',
    'Premio para probar canjes.',
    80,
    2,
    true,
    '10000000-0000-0000-0000-000000000101'
  ),
  (
    '10000000-0000-0000-0000-000000000402',
    '10000000-0000-0000-0000-000000000201',
    'Premio oculto',
    'Premio inactivo.',
    10,
    null,
    false,
    '10000000-0000-0000-0000-000000000101'
  );

insert into public.notifications (id, user_id, class_id, title, body)
values
  (
    '10000000-0000-0000-0000-000000000501',
    '10000000-0000-0000-0000-000000000102',
    '10000000-0000-0000-0000-000000000201',
    'Feedback one',
    'Visible only to student one.'
  ),
  (
    '10000000-0000-0000-0000-000000000502',
    '10000000-0000-0000-0000-000000000102',
    '10000000-0000-0000-0000-000000000201',
    'Feedback two',
    'Also visible to student one.'
  ),
  (
    '10000000-0000-0000-0000-000000000503',
    '10000000-0000-0000-0000-000000000103',
    '10000000-0000-0000-0000-000000000201',
    'Other feedback',
    'Must not be dismissed by student one.'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000102',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000102","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.rewards),
  1::bigint,
  'students read only active rewards in their class'
);

select is(
  public.available_xp(
    '10000000-0000-0000-0000-000000000102',
    '10000000-0000-0000-0000-000000000201'
  ),
  150,
  'available XP starts with approved assignment earnings'
);

select lives_ok(
  $$ select public.redeem_reward('10000000-0000-0000-0000-000000000401') $$,
  'an active student can redeem an affordable reward'
);

select is(
  (select count(*) from public.reward_redemptions),
  1::bigint,
  'the student reads the created redemption'
);

select is(
  public.available_xp(
    '10000000-0000-0000-0000-000000000102',
    '10000000-0000-0000-0000-000000000201'
  ),
  70,
  'a requested redemption immediately reduces available XP'
);

select is(
  (select stock from public.rewards where id = '10000000-0000-0000-0000-000000000401'),
  1,
  'redeeming atomically decrements finite stock'
);

select throws_ok(
  $$ select public.redeem_reward('10000000-0000-0000-0000-000000000401') $$,
  'P0001',
  'Insufficient XP.',
  'a student cannot overspend XP'
);

select is(
  public.dismiss_notifications(
    array['10000000-0000-0000-0000-000000000501'::uuid]
  ),
  1,
  'a student can dismiss one feedback entry'
);

select is(
  public.dismiss_notifications(null),
  1,
  'a student can clear all remaining feedback'
);

set local role service_role;

select ok(
  (select dismissed_at is not null from public.notifications where id = '10000000-0000-0000-0000-000000000501'),
  'individual dismissal persists'
);

select ok(
  (select dismissed_at is null from public.notifications where id = '10000000-0000-0000-0000-000000000503'),
  'dismissing feedback never changes another student notification'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000103',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000103","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.reward_redemptions),
  0::bigint,
  'students cannot read another student redemptions'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000101',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.rewards),
  2::bigint,
  'class staff reads active and inactive rewards'
);

select is(
  (select count(*) from public.reward_redemptions),
  1::bigint,
  'class staff reads class redemption requests'
);

select lives_ok(
  $$
    select public.update_reward_redemption_status(
      (select id from public.reward_redemptions limit 1),
      'cancelled'
    )
  $$,
  'class staff can cancel a pending redemption'
);

select is(
  (select stock from public.rewards where id = '10000000-0000-0000-0000-000000000401'),
  2,
  'cancelling restores finite stock'
);

set local role service_role;
select set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  true
);

select is(
  public.available_xp(
    '10000000-0000-0000-0000-000000000102',
    '10000000-0000-0000-0000-000000000201'
  ),
  150,
  'cancelling restores the student available XP'
);

select ok(
  public.claim_assignment_github_notification(
    '10000000-0000-0000-0000-000000000301'
  ),
  'the first GitHub delivery worker claims the assignment'
);

select isnt(
  public.claim_assignment_github_notification(
    '10000000-0000-0000-0000-000000000301'
  ),
  true,
  'a concurrent worker cannot claim the same pending delivery'
);

select * from finish();
rollback;
