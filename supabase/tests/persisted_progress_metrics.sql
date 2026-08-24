begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
('a1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','progress1@test.invalid','',now(),now(),now(),'{}','{"name":"Participante 1"}'),
('a1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','progress2@test.invalid','',now(),now(),now(),'{}','{"name":"Participante 2"}'),
('a1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','progress-monitor@test.invalid','',now(),now(),now(),'{}','{"name":"Monitor"}');
update public.profiles set account_status='active' where id::text like 'a1000000-%';
insert into public.classes (id,name,slug) values ('a2000000-0000-4000-8000-000000000001','Turma Progresso','turma-progresso');
insert into public.memberships (class_id,user_id,role) values
('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','participant'),
('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','participant'),
('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','monitor');
insert into public.class_mission_assignments (id,class_id,mission_version_id,assigned_by,status,available_from) values
('a3000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','active',now()-interval '1 day'),
('a3000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000003','active',now()-interval '1 day');
insert into public.attempts (id,participant_id,class_id,mission_version_id,assignment_id,current_step_id,status,completed_at,started_at,last_activity_at) values
('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','completed',now()-interval '2 minutes',now()-interval '10 minutes',now()),
('a4000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','completed',now(),now()-interval '5 minutes',now());
insert into public.attempt_events (id,attempt_id,participant_id,mission_version_id,class_id,step_id,sequence_number,event_type) values
('a5000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002',1,'help_requested'),
('a5000000-0000-4000-8000-000000000002','a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002',2,'audio_started'),
('a5000000-0000-4000-8000-000000000003','a4000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002',1,'action_succeeded');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select assigned_missions from public.get_participant_progress()),2,'participant assigned total');
select is((select completed_missions from public.get_participant_progress()),1,'repeat counts one completed mission');
select is((select progress_percent from public.get_participant_progress()),50,'repeat never reduces or inflates progress');
select is((select completed_attempt_count from public.get_participant_progress()),2,'both completed attempts remain persisted');
select is((select autonomy_percent from public.get_participant_progress()),50,'autonomy distinguishes helped and autonomous attempts');
select is((select audio_usage_percent from public.get_participant_progress()),50,'audio usage uses attempt denominator');
select is((select practice_streak_days from public.get_participant_progress()),1,'today completion creates one-day streak');
select is((select latest_completion_kind from public.get_participant_progress()),'autonomous','latest achievement classification is persisted');

select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select progress_percent from public.get_participant_progress()),0,'class without participant activity returns zero progress');
select is((select attempt_count from public.get_participant_progress()),0,'class without activity returns zero attempts');

select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select completed_missions from public.get_monitor_class_progress('a2000000-0000-4000-8000-000000000001',30)),1,'monitor sees same unique completion total');
select is((select completion_percent from public.get_monitor_class_progress('a2000000-0000-4000-8000-000000000001',30)),25,'class completion uses people times assignments denominator');
select is((select autonomy_percent from public.get_monitor_class_progress('a2000000-0000-4000-8000-000000000001',30)),50,'monitor autonomy matches participant attempts');

select * from finish();
rollback;
