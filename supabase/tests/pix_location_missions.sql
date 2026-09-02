begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

select is((select count(*) from public.mission_versions where id in ('20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003') and status = 'published'), 2::bigint, 'Pix and location have published versions');
select is((select count(*) from public.mission_steps where mission_version_id in ('20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003')), 8::bigint, 'both missions have complete four-step journeys');
select is((select count(*) from public.mission_steps where mission_version_id in ('20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003') and btrim(audio_text) <> ''), 8::bigint, 'every step has audio copy');
select is((select count(*) from public.mission_steps where mission_version_id in ('20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003') and jsonb_array_length(hints) > 0), 8::bigint, 'every step has help content');
select is((select count(*) from public.mission_steps where mission_version_id = '20000000-0000-4000-8000-000000000002' and safety_note ~* '(não|nenhum)'), 4::bigint, 'Pix steps explicitly exclude real financial effects');
select is((select count(*) from public.mission_steps where mission_version_id = '20000000-0000-4000-8000-000000000003' and safety_note ~* '(não|nenhum|nada)'), 4::bigint, 'location steps explicitly exclude real device effects');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('b1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','content-participant@test.invalid','',now(),now(),now(),'{}','{"name":"Participante Conteúdo"}'),
  ('b1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','content-admin@test.invalid','',now(),now(),now(),'{}','{"name":"Admin Conteúdo"}');
update public.profiles set account_status = 'active' where id::text like 'b1000000-%';
insert into public.classes (id,name,slug) values ('b2000000-0000-4000-8000-000000000001','Turma Conteúdo','turma-conteudo-pix-localizacao');
insert into public.memberships (class_id,user_id,role) values
  ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','participant'),
  ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002','admin');
insert into public.class_mission_assignments (id,class_id,mission_version_id,assigned_by,status,available_from) values
  ('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','active',now()-interval '1 hour'),
  ('b3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000002','active',now()-interval '1 hour');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.get_participant_mission_catalog()), 2::bigint, 'participant receives both published missions');
select is((select current_step_id from public.start_or_resume_mission_attempt('b3000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001')), '30000000-0000-4000-8000-000000000004'::uuid, 'autonomous Pix path starts at first step');
select is(public.set_mission_attempt_progress('b4000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000020',true), 'completed'::public.attempt_status, 'autonomous Pix path completes');
select is((select current_step_id from public.start_or_resume_mission_attempt('b3000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000002')), '30000000-0000-4000-8000-000000000007'::uuid, 'helped location path starts at first step');
select ok((select inserted from public.append_attempt_event('b5000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000002',1,'help_requested','30000000-0000-4000-8000-000000000007',date_trunc('second',now()),'{}')), 'help is persisted by the shared event pipeline');
select is(public.set_mission_attempt_progress('b4000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000021',true), 'completed'::public.attempt_status, 'helped location path completes');
select is((select completed_missions from public.get_participant_progress()), 2, 'both completions feed shared progress');
select is((select autonomy_percent from public.get_participant_progress()), 50, 'autonomous and helped paths produce distinct autonomy');
select is((select count(*) from public.attempt_events where attempt_id = 'b4000000-0000-4000-8000-000000000002' and event_type = 'help_requested'), 1::bigint, 'helped completion keeps its support event');

select * from finish();
rollback;
