begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select is((select status::text from public.missions where id='10000000-0000-4000-8000-00000000000a'),'active','Gov.br mission is active');
select is((select status::text from public.mission_versions where id='20000000-0000-4000-8000-00000000000a'),'published','Gov.br version is published');
select is((select count(*) from public.mission_steps where mission_version_id='20000000-0000-4000-8000-00000000000a'),9::bigint,'Gov.br mission has nine persisted steps');
select is((select count(*) from public.mission_steps where mission_version_id='20000000-0000-4000-8000-00000000000a' and btrim(audio_text)<>''),9::bigint,'every Gov.br step has audio text');
select is((select count(*) from public.mission_steps where mission_version_id='20000000-0000-4000-8000-00000000000a' and btrim(safety_note)<>''),9::bigint,'every Gov.br step has a safety note');
select is((select count(*) from public.mission_steps where mission_version_id='20000000-0000-4000-8000-00000000000a' and jsonb_array_length(hints)>0),9::bigint,'every Gov.br step has help content');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data) values
('e1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','gov-admin@test.invalid','',now(),now(),now(),'{}','{"name":"Admin Gov"}'),
('e1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','gov-student@test.invalid','',now(),now(),now(),'{}','{"name":"Aluno Gov"}');
update public.profiles set account_status='active' where id::text like 'e1000000-%';
insert into public.administrators(user_id,status) values('e1000000-0000-4000-8000-000000000001','active');
insert into public.classes(id,name,slug,created_by) values('e2000000-0000-4000-8000-000000000001','Turma Gov','turma-gov','e1000000-0000-4000-8000-000000000001');
insert into public.memberships(class_id,user_id,role) values('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000002','participant');
insert into public.class_mission_assignments(id,class_id,mission_version_id,assigned_by,assigned_by_role,status,is_required)
values('e3000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-00000000000a','e1000000-0000-4000-8000-000000000001','admin','active',false);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select title from public.get_participant_mission_catalog() where mission_id='10000000-0000-4000-8000-00000000000a'),'Criar conta no Gov.br','assigned student sees Gov.br in the catalog');

select * from finish();
rollback;
