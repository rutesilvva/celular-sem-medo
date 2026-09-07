begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data) values
('ba000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cert-admin@test.invalid','',now(),now(),now(),'{}','{"name":"Admin Cert"}'),
('ba000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cert-student@test.invalid','',now(),now(),now(),'{}','{"name":"Aluno Certificado"}');
update public.profiles set account_status='active' where id::text like 'ba000000-%';
insert into public.administrators(user_id,status) values('ba000000-0000-4000-8000-000000000001','active');
insert into public.classes(id,name,slug,created_by) values('bb000000-0000-4000-8000-000000000001','Oficina Certificada','oficina-certificada','ba000000-0000-4000-8000-000000000001');
insert into public.memberships(class_id,user_id,role) values('bb000000-0000-4000-8000-000000000001','ba000000-0000-4000-8000-000000000002','participant');

insert into public.missions(id,slug,title,summary,category,difficulty,estimated_minutes,status)
select ('bc000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'cert-mission-'||n,'Competência '||n,'Missão para certificado',case when n<3 then 'Comunicação' when n<5 then 'Segurança digital' else 'Serviços Públicos' end,'easy',10,'active' from generate_series(1,5)n;
insert into public.mission_versions(id,mission_id,version,status,title,description,learning_objective,content_language,published_at)
select ('bd000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('bc000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,1,'published','Competência '||n,'Descrição','Aprender','pt-BR',now() from generate_series(1,5)n;
insert into public.class_mission_assignments(id,class_id,mission_version_id,assigned_by,assigned_by_role,status,is_required)
select ('be000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'bb000000-0000-4000-8000-000000000001',('bd000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'ba000000-0000-4000-8000-000000000001','admin','active',true from generate_series(1,5)n;
insert into public.attempts(id,participant_id,class_id,mission_version_id,assignment_id,status,started_at,last_activity_at,completed_at)
select ('bf000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'ba000000-0000-4000-8000-000000000002','bb000000-0000-4000-8000-000000000001',('bd000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('be000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'completed',now(),now(),now() from generate_series(1,5)n;
insert into public.retention_checks(participant_id,assignment_id,source_attempt_id,due_at,answered_correctly,answered_at)
values('ba000000-0000-4000-8000-000000000002','be000000-0000-4000-8000-000000000001','bf000000-0000-4000-8000-000000000001',now()-interval '1 day',true,now());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ba000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select ok((select eligible from public.get_my_certificate_status()),'eligible student meets all certificate criteria');
select is((select competency_count from public.get_my_certificate_status()),3::bigint,'certificate counts distinct competencies');
select lives_ok($$select public.issue_my_participation_certificate('c0000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001')$$,'student issues certificate');
select is((select verification_code from public.get_my_certificate_status()),'c1000000-0000-4000-8000-000000000001'::uuid,'issued certificate appears in status');
select lives_ok($$select public.submit_mission_quality_feedback('c2000000-0000-4000-8000-000000000001','bf000000-0000-4000-8000-000000000001',5::smallint,4::smallint,array['none'])$$,'student evaluates a completed mission');
select throws_ok($$select public.submit_mission_quality_feedback(gen_random_uuid(),'bf000000-0000-4000-8000-000000000002',5::smallint,4::smallint,array['none','too_long'])$$,'22023','INVALID_MISSION_FEEDBACK','none cannot be combined with an issue');
select is((select count(*) from public.mission_quality_feedback),1::bigint,'student reads only submitted feedback');

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select ok((select valid from public.verify_participation_certificate('c1000000-0000-4000-8000-000000000001')),'public QR verification returns valid certificate');
select is((select count(*) from public.verify_participation_certificate(gen_random_uuid())),0::bigint,'unknown certificate reveals no data');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ba000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.update_certificate_settings('Instituto Parceiro','Maria Responsável','Coordenadora')$$,'admin configures institutional signature');
select is((select organization_name from public.certificate_settings),'Instituto Parceiro','institutional signature setting is persisted');
select is((select response_count from public.get_admin_mission_feedback_summary('bb000000-0000-4000-8000-000000000001')),1::bigint,'admin sees aggregate feedback count');
select is((select average_helpful from public.get_admin_mission_feedback_summary('bb000000-0000-4000-8000-000000000001')),5.00::numeric,'admin sees aggregate helpfulness');
select is((select average_clarity from public.get_admin_mission_feedback_summary('bb000000-0000-4000-8000-000000000001')),4.00::numeric,'admin sees aggregate clarity');
select is((select count(*) from public.participation_certificates),1::bigint,'admin can audit issued certificates');
select * from finish();
rollback;
