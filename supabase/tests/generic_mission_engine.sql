begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('91000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'engine@mission.test', '', now(), now(), now(), '{}', '{"name":"Executor"}'),
  ('91000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'engine-monitor@mission.test', '', now(), now(), now(), '{}', '{"name":"Monitor"}');
update public.profiles set account_status = 'active' where id in ('91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002');
insert into public.classes (id, name, slug) values ('92000000-0000-4000-8000-000000000001', 'Turma Executor', 'turma-executor');
insert into public.memberships (class_id, user_id, role) values
  ('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'participant'),
  ('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002', 'monitor');
insert into public.class_mission_assignments (id, class_id, mission_version_id, assigned_by, status, available_from)
values
  ('93000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000002', 'active', now() - interval '1 hour'),
  ('93000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', '91000000-0000-4000-8000-000000000002', 'active', now() - interval '1 hour');

select is((select count(*) from public.missions where slug in ('pedir-um-uber', 'baixar-um-aplicativo')), 2::bigint, 'new safe missions exist');
select is((select count(*) from public.mission_steps where mission_version_id in ('20000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000005')), 6::bigint, 'new missions are data-driven');
select is((select count(*) from public.mission_steps where mission_version_id in ('20000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000005') and safety_note ~* '(não|nenhum|nada)'), 6::bigint, 'every new step documents absence of real effects');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.get_participant_mission_catalog()), 2::bigint, 'participant receives both assigned missions');
select is((select attempt_id from public.start_or_resume_mission_attempt('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001')), '94000000-0000-4000-8000-000000000001'::uuid, 'executor starts requested idempotent attempt id');
select is((select current_step_id from public.start_or_resume_mission_attempt('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002')), '30000000-0000-4000-8000-000000000010'::uuid, 'resume restores persisted current step');
select is((select attempt_id from public.start_or_resume_mission_attempt('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002')), '94000000-0000-4000-8000-000000000001'::uuid, 'resume does not create a parallel attempt');
select is(public.set_mission_attempt_progress('94000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000011', false), 'in_progress'::public.attempt_status, 'progress persists the next step');
select is((select current_step_id from public.start_or_resume_mission_attempt('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002')), '30000000-0000-4000-8000-000000000011'::uuid, 'refresh restores persisted progress');
select is(public.set_mission_attempt_progress('94000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000012', true), 'completed'::public.attempt_status, 'completion closes the attempt');
select is((select attempt_id from public.start_or_resume_mission_attempt('93000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002')), '94000000-0000-4000-8000-000000000002'::uuid, 'practice again creates a new attempt');
select is((select count(*) from public.attempts where participant_id = '91000000-0000-4000-8000-000000000001' and status = 'completed'), 1::bigint, 'practice again preserves previous achievement');

select * from finish();
rollback;
