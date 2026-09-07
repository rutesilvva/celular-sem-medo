begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data) values
('aa000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','evidence-admin@test.invalid','',now(),now(),now(),'{}','{"name":"Admin Evidence"}'),
('aa000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','evidence-student@test.invalid','',now(),now(),now(),'{}','{"name":"Student Evidence"}');
update public.profiles set account_status='active' where id::text like 'aa000000-%';
insert into public.administrators(user_id,status) values('aa000000-0000-4000-8000-000000000001','active');
insert into public.classes(id,name,slug,created_by) values('ab000000-0000-4000-8000-000000000001','Evidence Class','evidence-class','aa000000-0000-4000-8000-000000000001');
insert into public.memberships(class_id,user_id,role) values('ab000000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000002','participant');
insert into public.class_mission_assignments(id,class_id,mission_version_id,assigned_by,assigned_by_role,status,is_required)
values('ac000000-0000-4000-8000-000000000001','ab000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000007','aa000000-0000-4000-8000-000000000001','admin','active',true);
insert into public.attempts(id,participant_id,class_id,mission_version_id,assignment_id,current_step_id,status,started_at,last_activity_at)
values('ad000000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000002','ab000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000007','ac000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000022','in_progress',now(),now());
update public.attempts set status='completed',completed_at=now() where id='ad000000-0000-4000-8000-000000000001';
select is((select count(*) from public.retention_checks where participant_id='aa000000-0000-4000-8000-000000000002'),1::bigint,'completion schedules one retention check');
update public.retention_checks set due_at=now()-interval '1 minute' where participant_id='aa000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.get_my_evolution_timeline()),1::bigint,'student sees own evolution timeline');
select ok((select autonomous from public.get_my_evolution_timeline() limit 1),'completion without support is autonomous');
select is((select count(*) from public.get_my_retention_checks() where is_due),1::bigint,'due retention check is visible');
select lives_ok($$select public.answer_my_retention_check((select check_id from public.get_my_retention_checks() where is_due limit 1),true)$$,'student answers own due retention check');
select ok((select answered_correctly from public.get_my_retention_checks() limit 1),'retention result is persisted');
select throws_ok($$select public.answer_my_retention_check(gen_random_uuid(),true)$$,'42501','RETENTION_CHECK_NOT_AVAILABLE','unknown retention check is denied');

select set_config('request.jwt.claims','{"sub":"aa000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select participants from public.get_admin_pre_post_impact('ab000000-0000-4000-8000-000000000001')),1::bigint,'admin sees aggregate participant count');
select is((select retention_percent from public.get_admin_pre_post_impact('ab000000-0000-4000-8000-000000000001')),100.0::numeric,'admin sees aggregate retention without identity');
select * from finish();
rollback;
