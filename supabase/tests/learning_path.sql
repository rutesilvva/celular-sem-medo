begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data) values
('f1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','path-admin@test.invalid','',now(),now(),now(),'{}','{"name":"Admin Trilha"}'),
('f1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','path-student@test.invalid','',now(),now(),now(),'{}','{"name":"Aluno Trilha"}'),
('f1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','path-outsider@test.invalid','',now(),now(),now(),'{}','{"name":"Fora"}');
update public.profiles set account_status='active' where id::text like 'f1000000-%';
insert into public.administrators(user_id,status) values('f1000000-0000-4000-8000-000000000001','active');
insert into public.classes(id,name,slug,created_by) values('f2000000-0000-4000-8000-000000000001','Turma Trilha','turma-trilha','f1000000-0000-4000-8000-000000000001');
insert into public.memberships(class_id,user_id,role) values('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002','participant');
insert into public.class_mission_assignments(id,class_id,mission_version_id,assigned_by,assigned_by_role,status,is_required)
values('f3000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000007','f1000000-0000-4000-8000-000000000001','admin','active',true);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.save_my_learning_diagnostic(gen_random_uuid(),'beginner','practice',array['Segurança digital'],'{"Segurança digital":2}')$$,'42501','DIAGNOSTIC_ACCESS_DENIED','unlinked account cannot save diagnostic');
select is((select count(*) from public.get_my_learning_diagnostic()),0::bigint,'unlinked account has no diagnostic');

select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select public.save_my_learning_diagnostic_v3('f4000000-0000-4000-8000-000000000001','beginner','practice',array['Segurança digital'],'{"Segurança digital":2}',array['fear_wrong_tap','scam_fear'],'verify_known_contact',array['whatsapp','photos'],'ask_help')$$,'student saves complete structured diagnostic');
select is((select experience_level from public.get_my_learning_diagnostic()),'beginner','student reads own diagnostic');
select is((select barriers from public.get_my_learning_diagnostic_v2()),array['fear_wrong_tap','scam_fear']::text[],'student reads own barriers');
select is((select scam_response from public.get_my_learning_diagnostic_v2()),'verify_known_contact','student reads own scam response');
select is((select independent_actions from public.get_my_learning_diagnostic_v3()),array['whatsapp','photos']::text[],'student reads own independent actions');
select is((select support_response from public.get_my_learning_diagnostic_v3()),'ask_help','student reads own support response');
select throws_ok($$select public.save_my_learning_diagnostic_v3(gen_random_uuid(),'beginner','practice',array['Segurança digital'],'{"Segurança digital":2}',array['scam_fear'],'unsure',array['none','pix'],'ask_help')$$,'22023','INVALID_DIAGNOSTIC_BEHAVIOR_ANSWERS','none cannot be combined with independent actions');
select throws_ok($$select public.save_my_learning_diagnostic_v2(gen_random_uuid(),'beginner','practice',array['Segurança digital'],'{"Segurança digital":2}',array['not_allowed'],'unsure')$$,'22023','INVALID_DIAGNOSTIC_ADDITIONAL_ANSWERS','invalid barrier is rejected');
select throws_ok($$select public.save_my_learning_diagnostic(gen_random_uuid(),'invalid','practice',array['Segurança digital'],'{"Segurança digital":2}')$$,'22023','INVALID_DIAGNOSTIC','invalid experience is rejected');
select throws_ok($$select public.save_my_learning_diagnostic(gen_random_uuid(),'beginner','practice',array['Segurança digital'],'{"Outra categoria":2}')$$,'22023','INVALID_DIAGNOSTIC','confidence must match the selected goals');
select throws_ok($$insert into public.learning_diagnostics(id,participant_id,experience_level,preferred_format,goals,category_confidence) values(gen_random_uuid(),'f1000000-0000-4000-8000-000000000002','beginner','read',array['x'],'{"x":2}')$$,'42501',null,'direct diagnostic writes are denied');
select is((select recommendation_reason from public.get_personalized_mission_recommendations('') limit 1),'Você indicou pouca confiança nesta categoria','diagnostic explains the recommendation');

reset role;
insert into public.attempts(id,participant_id,class_id,mission_version_id,assignment_id,current_step_id,status,started_at,last_activity_at)
values('f5000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000007','f3000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000022','in_progress',now(),now());
insert into public.attempt_events(id,attempt_id,participant_id,mission_version_id,class_id,sequence_number,event_type,occurred_at)
values('f6000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000007','f2000000-0000-4000-8000-000000000001',1,'help_requested',now());
update public.attempts set status='completed',completed_at=now() where id='f5000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select interval_days from public.get_my_review_plan()),1::smallint,'help schedules a short review');
select is((select review_reason from public.get_my_review_plan()),'Você usou apoio e uma revisão curta pode aumentar sua autonomia.','review reason is transparent');
select is((select count(*) from public.get_my_daily_mission()),1::bigint,'daily mission is available');
select is((select count(*) from public.get_my_daily_mission()),1::bigint,'daily mission call is idempotent');
select is((select count(*) from public.daily_mission_choices where participant_id='f1000000-0000-4000-8000-000000000002'),1::bigint,'only one daily choice is persisted');

select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*) from public.mission_review_schedules),0::bigint,'outsider cannot read review schedules');
select is((select count(*) from public.daily_mission_choices),0::bigint,'outsider cannot read daily choices');

select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.learning_diagnostics),1::bigint,'global admin can read diagnostic aggregate source');
select is((select count(*) from public.mission_review_schedules),1::bigint,'global admin can read review schedule for support');

select * from finish();
rollback;
