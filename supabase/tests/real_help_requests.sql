begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data) values
('c1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','help-participant@test.invalid','',now(),now(),now(),'{}','{"name":"Participante Ajuda"}'),
('c1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','help-monitor@test.invalid','',now(),now(),now(),'{}','{"name":"Monitor Ajuda"}'),
('c1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','help-outsider@test.invalid','',now(),now(),now(),'{}','{"name":"Monitor Outra Turma"}');
update public.profiles set account_status='active' where id::text like 'c1000000-%';
insert into public.classes(id,name,slug) values
('c2000000-0000-4000-8000-000000000001','Turma Ajuda','turma-ajuda-real'),
('c2000000-0000-4000-8000-000000000002','Outra Turma Ajuda','outra-turma-ajuda-real');
insert into public.memberships(class_id,user_id,role) values
('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','participant'),
('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002','monitor'),
('c2000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000003','monitor');
insert into public.class_mission_assignments(id,class_id,mission_version_id,assigned_by,status,available_from) values
('c3000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002','active',now()-interval '1 hour');
insert into public.attempts(id,participant_id,class_id,mission_version_id,assignment_id,current_step_id) values
('c4000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select help_request_id from public.create_help_request('c5000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','stuck_step')),'c5000000-0000-4000-8000-000000000001'::uuid,'participant creates persistent request');
select is((select help_request_id from public.create_help_request('c5000000-0000-4000-8000-000000000099','c4000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','stuck_step')),'c5000000-0000-4000-8000-000000000001'::uuid,'repeated tap returns active request idempotently');
select is((select count(*) from public.get_my_help_requests()),1::bigint,'participant sees own request');
select is((select status from public.get_my_help_requests()),'open'::public.help_request_status,'new request is open');
select is((select count(*) from public.help_request_history where help_request_id='c5000000-0000-4000-8000-000000000001'),1::bigint,'creation is audited');
set local role postgres;
select is((select count(*) from public.push_outbox where help_request_id='c5000000-0000-4000-8000-000000000001' and recipient_id='c1000000-0000-4000-8000-000000000002'),1::bigint,'monitor receives queued notification');
select is((select body from public.push_outbox where help_request_id='c5000000-0000-4000-8000-000000000001'),'Há um novo pedido de ajuda no aplicativo.','locked-screen copy contains no context');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.create_help_request('c5000000-0000-4000-8000-000000000002','c4000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000009','stuck_step')$$,'42501','HELP_CONTEXT_NOT_FOUND','invalid step discloses no content');
select lives_ok($$select public.register_push_device('ExponentPushToken[test_help_device]','android')$$,'participant registers push after permission');

select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select * from public.get_monitor_help_requests('c2000000-0000-4000-8000-000000000001')$$,'42501','CLASS_ACCESS_DENIED','other-class monitor is denied');
select throws_ok($$select public.update_help_request('c5000000-0000-4000-8000-000000000001','in_progress',null)$$,'42501','HELP_REQUEST_NOT_FOUND','other-class monitor cannot update request');

select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.get_monitor_help_requests('c2000000-0000-4000-8000-000000000001')),1::bigint,'linked monitor sees class inbox');
select is(public.update_help_request('c5000000-0000-4000-8000-000000000001','in_progress',null),'in_progress'::public.help_request_status,'monitor starts service');
select is(public.update_help_request('c5000000-0000-4000-8000-000000000001','resolved','review_hint'),'resolved'::public.help_request_status,'monitor resolves with structured guidance');
select is((select count(*) from public.help_request_history where help_request_id='c5000000-0000-4000-8000-000000000001'),3::bigint,'status history is auditable');

select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select resolution_code from public.get_my_help_requests()),'review_hint','participant sees monitor response');
set local role postgres;
select is((select count(*) from public.push_outbox where help_request_id='c5000000-0000-4000-8000-000000000001' and recipient_id='c1000000-0000-4000-8000-000000000001'),2::bigint,'participant receives status updates');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.cancel_my_help_request('c5000000-0000-4000-8000-000000000001')$$,'42501','HELP_REQUEST_NOT_CANCELLABLE','closed request cannot be cancelled');

select * from finish(); rollback;
