begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data) values
('e1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','impact-admin@test.invalid','',now(),now(),now(),'{}','{"name":"Admin Impacto"}'),
('e1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','impact-student@test.invalid','',now(),now(),now(),'{}','{"name":"Aluno Impacto"}'),
('e1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','outsider@test.invalid','',now(),now(),now(),'{}','{"name":"Fora"}');
update public.profiles set account_status='active' where id::text like 'e1000000-%';
insert into public.administrators(user_id,status) values('e1000000-0000-4000-8000-000000000001','active');
insert into public.classes(id,name,slug,created_by) values('e2000000-0000-4000-8000-000000000001','Turma Impacto','turma-impacto','e1000000-0000-4000-8000-000000000001');
insert into public.memberships(class_id,user_id,role) values('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000002','participant');
insert into public.class_mission_assignments(id,class_id,mission_version_id,assigned_by,assigned_by_role,status,is_required) values('e3000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000007','e1000000-0000-4000-8000-000000000001','admin','active',true);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select public.start_mission_self_assessment('e4000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001',2::smallint)$$,'student starts confidence assessment');
select throws_ok($$select public.start_mission_self_assessment(gen_random_uuid(),'e3000000-0000-4000-8000-000000000001',6::smallint)$$,'42501','ASSESSMENT_NOT_ALLOWED','rating range is enforced');
select is((select count(*) from public.get_personalized_mission_recommendations('golpe')),1::bigint,'smart search finds assigned scam mission');
select lives_ok($$select public.create_learning_request('e5000000-0000-4000-8000-000000000001','aprender videochamada')$$,'student records unmet learning need');
select is((select count(*) from public.learning_requests),1::bigint,'student reads own request');

reset role;
select set_config('request.jwt.claims','{}',true);
insert into public.attempts(id,participant_id,class_id,mission_version_id,assignment_id,current_step_id,status,started_at,last_activity_at,completed_at) values('e6000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000007','e3000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000022','completed',now(),now(),now());
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.complete_mission_self_assessment('e4000000-0000-4000-8000-000000000001','e6000000-0000-4000-8000-000000000001',5::smallint),3,'confidence gain is calculated server-side');
select throws_ok($$select * from public.get_admin_impact_summary('e2000000-0000-4000-8000-000000000001')$$,'42501','ADMIN_ACCESS_REQUIRED','student cannot read admin impact');
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.create_learning_request(gen_random_uuid(),'pedido indevido')$$,'22023','LEARNING_REQUEST_NOT_ALLOWED','unlinked user cannot create request');
select is((select count(*) from public.mission_self_assessments),0::bigint,'outsider cannot read assessments');

select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select participants from public.get_admin_impact_summary('e2000000-0000-4000-8000-000000000001')),1::bigint,'impact counts students');
select is((select completed_missions from public.get_admin_impact_summary('e2000000-0000-4000-8000-000000000001')),1::bigint,'impact counts completions');
select is((select average_confidence_gain from public.get_admin_impact_summary('e2000000-0000-4000-8000-000000000001')),3.00::numeric,'impact reports confidence gain');
select is((select count(*) from public.get_admin_workshop_status('e2000000-0000-4000-8000-000000000001')),1::bigint,'workshop lists class students');
select is((select current_mission from public.get_admin_workshop_status('e2000000-0000-4000-8000-000000000001')),'Identificar mensagem de golpe','workshop exposes current safe mission');
select is((select count(*) from public.learning_requests),1::bigint,'admin reads class learning requests');

select * from finish();
rollback;
