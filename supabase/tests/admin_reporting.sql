begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
('d1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin-report@test.invalid','',now(),now(),now(),'{}','{"name":"Admin"}'),
('d1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','participant-one@test.invalid','',now(),now(),now(),'{}','{"name":"Ana Participante"}'),
('d1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','participant-two@test.invalid','',now(),now(),now(),'{}','{"name":"Bia Participante"}'),
('d1000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','participant-three@test.invalid','',now(),now(),now(),'{}','{"name":"Caio Participante"}'),
('d1000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-admin@test.invalid','',now(),now(),now(),'{}','{"name":"Outro Admin"}');
update public.profiles set account_status='active' where id::text like 'd1000000-%';

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select md5('admin-large-' || number::text)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'large-' || number || '@test.invalid', '', now(), now(), now(), '{}', jsonb_build_object('name', 'Pessoa ' || lpad(number::text, 2, '0'))
from generate_series(1,25) number;
update public.profiles set account_status='active' where id in (select md5('admin-large-' || number::text)::uuid from generate_series(1,25) number);

insert into public.classes (id,name,slug) values
('d2000000-0000-4000-8000-000000000001','Turma Relatórios','turma-relatorios'),
('d2000000-0000-4000-8000-000000000002','Turma Sem Atividade','turma-sem-atividade');
insert into public.memberships (class_id,user_id,role) values
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','admin'),
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','participant'),
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000003','participant'),
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000004','participant'),
('d2000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000005','admin');
insert into public.memberships (class_id,user_id,role)
select 'd2000000-0000-4000-8000-000000000001', md5('admin-large-' || number::text)::uuid, 'participant'::public.app_role
from generate_series(1,25) number;

insert into public.class_mission_assignments (id,class_id,mission_version_id,assigned_by,status,available_from) values
('d3000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','active',now()-interval '10 days');
insert into public.attempts (id,participant_id,class_id,mission_version_id,assignment_id,status,completed_at,started_at,last_activity_at,score) values
('d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000001','completed',now()-interval '2 days',now()-interval '3 days',now()-interval '2 days',80);
insert into public.attempt_events (id,attempt_id,participant_id,mission_version_id,class_id,sequence_number,event_type,occurred_at) values
('d5000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001',1,'audio_started',now()-interval '3 days'),
('d5000000-0000-4000-8000-000000000002','d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001',2,'attempt_completed',now()-interval '2 days');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.get_admin_participants_page('d2000000-0000-4000-8000-000000000001',30,'','all','name',2,0)),2::bigint,'page size is enforced server-side');
select is((select total_count from public.get_admin_participants_page('d2000000-0000-4000-8000-000000000001',30,'','all','name',2,0) limit 1),28::bigint,'page returns the filtered total for a large list');
select is((select count(*) from public.get_admin_participants_page('d2000000-0000-4000-8000-000000000001',30,'','all','name',20,20)),8::bigint,'offset returns the remaining large-list page');
select is((select display_name from public.get_admin_participants_page('d2000000-0000-4000-8000-000000000001',30,'Bia','all','name',20,0)),'Bia Participante','search operates on persisted names');
select is((select total_count from public.get_admin_participants_page('d2000000-0000-4000-8000-000000000001',30,'','attention','name',20,0) limit 1),27::bigint,'attention filter handles a real participant set');
select is((select display_name from public.get_admin_participants_page('d2000000-0000-4000-8000-000000000001',30,'','all','progress_desc',20,0) limit 1),'Ana Participante','progress ordering is server-side');
select is((select completed_missions from public.get_admin_participant_report('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002',7)),1,'detail uses period events');
select is((select count(*) from public.get_admin_participant_history('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002',7,20)),1::bigint,'history returns the real attempt');
select is((select count(*) from public.get_admin_participant_report('d2000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000099',30)),0::bigint,'invalid participant id discloses nothing');
select is((select count(*) from public.get_admin_participant_history('d2000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000099',30,20)),0::bigint,'invalid history id discloses nothing');
select is((select completed_missions from public.get_admin_class_progress('d2000000-0000-4000-8000-000000000001',30)),1,'class total counts the completion once');
select is((select completed_missions from public.get_admin_participants_page('d2000000-0000-4000-8000-000000000001',30,'Ana','all','name',20,0)),1,'list and class totals use the same completion');
select is((select completed_participants from public.get_admin_mission_progress('d2000000-0000-4000-8000-000000000001',30)),1,'mission and detail totals are consistent');
select is((select sum(attempt_count)::integer from public.get_admin_class_evolution('d2000000-0000-4000-8000-000000000001',30)),1,'evolution is derived from the same attempt');
select throws_ok($$select * from public.get_admin_participants_page('d2000000-0000-4000-8000-000000000002',30,'','all','name',20,0)$$,'42501','admin access required','admin cannot query another class');
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select is((select active_participants from public.get_admin_class_progress('d2000000-0000-4000-8000-000000000002',30)),0,'class without activity returns an explicit zero-activity aggregate');

select * from finish();
rollback;
