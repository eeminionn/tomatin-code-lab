begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'owner@test.local', '',
    now(), '{}', '{"user_name":"eeminionn","provider_id":"109454414"}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'one@test.local', '',
    now(), '{}', '{"name":"Student One"}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'two@test.local', '',
    now(), '{}', '{"name":"Student Two"}', now(), now()
  );

insert into public.classes (id, name, owner_id)
values (
  '00000000-0000-0000-0000-000000000201',
  'RLS Test Class',
  '00000000-0000-0000-0000-000000000101'
);

insert into public.memberships (class_id, user_id, role)
values
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101',
    'owner'
  ),
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000102',
    'student'
  ),
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000103',
    'student'
  );

insert into public.assignments (
  id, class_id, mission_id, mission_version, title, due_at, points,
  student_ids, status, created_by
)
values (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000201',
  'p1-01-la-once',
  1,
  'RLS assignment',
  now() + interval '1 day',
  100,
  array[
    '00000000-0000-0000-0000-000000000102'::uuid,
    '00000000-0000-0000-0000-000000000103'::uuid
  ],
  'published',
  '00000000-0000-0000-0000-000000000101'
);

insert into public.student_progress (class_id, user_id, assignment_id)
values
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000301'
  ),
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000301'
  );

insert into public.attempts (
  id, class_id, user_id, mission_id, assignment_id, mission_version,
  language, kind, remote, code, result
)
values (
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000103',
  'p1-01-la-once',
  '00000000-0000-0000-0000-000000000301',
  1,
  'python',
  'run',
  false,
  'print(42)',
  '{"status":"passed","tests":[]}'
);

insert into public.drafts (
  user_id,
  assignment_id,
  mission_id,
  mission_version,
  language,
  code
)
values
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000301',
    'p1-01-la-once',
    1,
    'python',
    'own draft'
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000301',
    'p1-01-la-once',
    1,
    'python',
    'private draft'
  );

insert into public.reviews (
  attempt_id,
  mentor_id,
  decision,
  comment,
  inline_comments,
  criteria
)
values (
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000101',
  'comment',
  'Private feedback',
  '[{"line":1,"body":"Private line comment"}]',
  '[{"id":"correctness","label":"Correctitud","met":true}]'
);

insert into public.notifications (user_id, class_id, title, body)
values
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000201',
    'Own feedback',
    'Visible'
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000201',
    'Other feedback',
    'Private'
  );

update public.student_progress
set status = 'awaiting_review'
where user_id = '00000000-0000-0000-0000-000000000103';

update public.missions
set current_version = current_version + 1
where id = 'p1-01-la-once';

select is(
  (
    select progress.mission_version
    from public.student_progress progress
    where progress.user_id = '00000000-0000-0000-0000-000000000102'
  ),
  (
    select mission.current_version
    from public.missions mission
    where mission.id = 'p1-01-la-once'
  ),
  'publishing migrates open progress to the current mission version'
);

select is(
  (
    select progress.mission_version
    from public.student_progress progress
    where progress.user_id = '00000000-0000-0000-0000-000000000103'
  ),
  1,
  'publishing preserves the version of a submission awaiting review'
);

update public.student_progress
set status = 'changes_requested'
where user_id = '00000000-0000-0000-0000-000000000103';

select is(
  (
    select progress.mission_version
    from public.student_progress progress
    where progress.user_id = '00000000-0000-0000-0000-000000000103'
  ),
  (
    select mission.current_version
    from public.missions mission
    where mission.id = 'p1-01-la-once'
  ),
  'requesting changes migrates the student to the current mission version'
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

select is(
  (
    select count(*)
    from public.get_mission_variant_secure(
      (
        select variant.id
        from public.mission_variants variant
        join public.mission_versions version
          on version.id = variant.mission_version_id
        where version.mission_id = 'p1-01-la-once'
        order by version.version desc
        limit 1
      )
    )
  ),
  1::bigint,
  'service role reads one secure variant through the narrow RPC'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.upsert_mission_variant_secure(uuid,text,jsonb)',
    'EXECUTE'
  ),
  'service role can maintain secure variants through the write RPC'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000102',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.attempts),
  0::bigint,
  'students cannot read another student code'
);

select is(
  (select count(*) from public.student_progress),
  1::bigint,
  'students only read their own progress'
);

select is(
  (select count(*) from public.drafts),
  1::bigint,
  'students only read their own versioned drafts'
);

select is(
  (select count(*) from public.reviews),
  0::bigint,
  'students cannot read reviews on another student attempt'
);

select is(
  (select count(*) from public.notifications),
  1::bigint,
  'students only read their own notifications'
);

select lives_ok(
  $$
    update public.profiles
    set
      display_name = 'Student Alias',
      avatar_config = '{"top":"shortFlat"}'::jsonb
    where id = '00000000-0000-0000-0000-000000000102'
  $$,
  'students can update their own display name and avatar configuration'
);

select throws_ok(
  $$
    update public.profiles
    set github_login = 'forged-login'
    where id = '00000000-0000-0000-0000-000000000102'
  $$,
  'P0001',
  'Profile identity fields cannot be changed by the user.',
  'students cannot change their GitHub identity'
);

select lives_ok(
  $$
    update public.notifications
    set dismissed_at = now()
    where title = 'Own feedback'
  $$,
  'students can dismiss their own feedback notification'
);

select throws_ok(
  $$
    update public.notifications
    set title = 'Rewritten feedback'
    where title = 'Own feedback'
  $$,
  '42501',
  'permission denied for table notifications',
  'students cannot rewrite mentor feedback'
);

select lives_ok(
  $$
    select public.record_student_activity(
      '00000000-0000-0000-0000-000000000301',
      'python',
      'editing'
    )
  $$,
  'students can record throttled activity for their own assignment'
);

select results_eq(
  $$
    select last_event
    from public.student_progress
    where user_id = '00000000-0000-0000-0000-000000000102'
  $$,
  array['editing'::text],
  'activity updates the current student progress only'
);

select throws_ok(
  $$select * from private.mission_variants_secure limit 1$$,
  '42501',
  'permission denied for schema private',
  'students cannot access private tests or solutions'
);

select throws_ok(
  $$
    select *
    from public.get_mission_variant_secure(
      '00000000-0000-0000-0000-000000000000'
    )
  $$,
  '42501',
  'permission denied for function get_mission_variant_secure',
  'students cannot call the secure variant RPC'
);

select throws_ok(
  $$
    insert into public.attempts (
      class_id, user_id, mission_id, assignment_id, mission_version,
      language, kind, remote, code, result
    )
    values (
      '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000102',
      'p1-01-la-once',
      '00000000-0000-0000-0000-000000000301',
      1, 'python', 'submit', false, 'print(42)', '{"status":"passed"}'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "attempts"',
  'students cannot forge a submission'
);

select lives_ok(
  $$
    insert into public.attempts (
      class_id, user_id, mission_id, assignment_id, mission_version,
      language, kind, remote, code, result
    )
    values (
      '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000102',
      'p1-01-la-once',
      '00000000-0000-0000-0000-000000000301',
      1, 'python', 'run', false, 'print(42)', '{"status":"passed"}'
    )
  $$,
  'students can record their own local run'
);

select throws_ok(
  $$
    update public.student_progress
    set status = 'approved'
    where user_id = '00000000-0000-0000-0000-000000000102'
  $$,
  '42501',
  'permission denied for table student_progress',
  'students cannot approve their own work'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000101',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)
    from public.attempts
    where user_id = '00000000-0000-0000-0000-000000000103'
  ),
  1::bigint,
  'the owner can review student attempts'
);

select * from finish();
rollback;
