begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'participant-a@test.invalid', '', now(), now(), now(), '{}', '{"name":"Participante A"}'),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'monitor-a@test.invalid', '', now(), now(), now(), '{}', '{"name":"Monitor A"}'),
  ('a0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'monitor-b@test.invalid', '', now(), now(), now(), '{}', '{"name":"Monitor B"}'),
  ('a0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'orphan@test.invalid', '', now(), now(), now(), '{}', '{"name":"Sem vínculo"}');

update public.profiles
set account_status = 'active'
where id in (
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000003'
);

insert into public.classes (id, name, slug, status)
values
  ('b0000000-0000-4000-8000-000000000001', 'Turma A', 'teste-turma-a', 'active'),
  ('b0000000-0000-4000-8000-000000000002', 'Turma B', 'teste-turma-b', 'active'),
  ('b0000000-0000-4000-8000-000000000003', 'Turma arquivada', 'teste-turma-arquivada', 'archived');

insert into public.memberships (class_id, user_id, role)
values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'participant'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'monitor'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'monitor'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'participant');

insert into public.class_mission_assignments (
  id, class_id, mission_version_id, assigned_by, status, available_from, due_at
)
values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'active', now() - interval '1 day', now() + interval '1 day'),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'scheduled', now() + interval '1 day', now() + interval '2 days');

insert into public.attempts (
  id, participant_id, class_id, mission_version_id, assignment_id, metadata
)
values (
  'd0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001',
  '{"internal":"must-not-reach-monitor"}'
);

insert into public.attempt_events (
  id, attempt_id, participant_id, mission_version_id, class_id,
  sequence_number, event_type, payload
)
values (
  'e0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  1, 'attempt_started', '{"internal":"must-not-reach-monitor"}'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((select count(*) from public.missions), 0::bigint, 'orphan cannot read catalog');
select is((select error_code from public.get_my_auth_context()), 'ACCOUNT_NOT_PROVISIONED', 'unknown account receives explicit code');
select is((select cardinality(access_roles) from public.get_my_auth_context()), 0, 'unknown account receives no roles');

select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.class_mission_assignments), 1::bigint, 'participant sees only active available assignment');
select ok(public.has_active_class_role('b0000000-0000-4000-8000-000000000001', 'participant'), 'active participant membership is accepted');
select isnt(public.has_active_class_role('b0000000-0000-4000-8000-000000000003', 'participant'), true, 'archived class membership is rejected');
select is((select count(*) from public.attempts), 1::bigint, 'participant reads own attempt while membership is active');
select is((select error_code from public.get_my_auth_context()), null, 'provisioned account has no auth error');
select is((select access_roles from public.get_my_auth_context()), array['participant']::text[], 'account receives only server-side role');

select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"monitor"}}', true);
select throws_ok(
  $$select * from public.get_monitor_attempt_summaries('b0000000-0000-4000-8000-000000000001')$$,
  '42501',
  'monitor access required',
  'forged monitor claim does not grant monitor access'
);

select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.attempts), 0::bigint, 'monitor cannot select raw attempts');
select is((select count(*) from public.get_monitor_attempt_summaries('b0000000-0000-4000-8000-000000000001')), 1::bigint, 'monitor reads safe attempt summary for own class');
select isnt(public.can_monitor_user('a0000000-0000-4000-8000-000000000002'), true, 'monitor cannot read another monitor through participant helper');

select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.get_monitor_attempt_summaries('b0000000-0000-4000-8000-000000000001')$$,
  '42501',
  'monitor access required',
  'monitor cannot request another class summary'
);

reset role;
select throws_ok(
  $$insert into public.memberships (class_id, user_id, role) values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'monitor')$$,
  '23505',
  null,
  'one user cannot hold two roles in the same class'
);

update public.profiles
set account_status = 'blocked', block_reason_code = 'SECURITY_REVIEW'
where id = 'a0000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select isnt(public.is_account_active(), true, 'blocked account is not active');
select is((select count(*) from public.classes), 0::bigint, 'blocked monitor loses operational access immediately');
select is((select error_code from public.get_my_auth_context()), 'ACCOUNT_BLOCKED', 'blocked account receives explicit code');
select is((select cardinality(access_roles) from public.get_my_auth_context()), 0, 'blocked account receives no roles');

select * from finish();
rollback;
