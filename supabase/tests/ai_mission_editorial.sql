begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data) values
('d1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','editor@test.invalid','',now(),now(),now(),'{}','{"name":"Editor"}'),
('d1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','requester@test.invalid','',now(),now(),now(),'{}','{"name":"Aluno"}');
update public.profiles set account_status='active' where id::text like 'd1000000-%';
insert into public.administrators(user_id,status) values('d1000000-0000-4000-8000-000000000001','active');
insert into public.classes(id,name,slug,created_by) values('d2000000-0000-4000-8000-000000000001','Turma Editorial','turma-editorial','d1000000-0000-4000-8000-000000000001');
insert into public.memberships(class_id,user_id,role) values('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','participant');
insert into public.ai_mission_drafts(id,requested_by,source_query,title,summary,difficulty,estimated_minutes,generated_content) values(
'd3000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','ver vídeo no YouTube','Assistir a um vídeo','Treino seguro','easy',5,
'[{"type":"instruction","title":"Pesquisar","instruction":"Pesquise um assunto fictício.","audioText":"Pesquise com calma.","safetyNote":"Nenhum site será aberto.","expectedAction":{"action":"continue"},"options":[],"hints":["Use a busca."]},{"type":"confirmation","title":"Concluir","instruction":"Finalize o treino.","audioText":"Finalize.","safetyNote":"Nenhuma ação real.","expectedAction":{"action":"choose","option_id":"finish"},"options":[{"id":"finish","label":"Finalizar"}],"hints":["Toque em finalizar."]}]');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select * from public.get_admin_ai_mission_drafts()$$,'42501','ADMIN_ACCESS_REQUIRED','student cannot list AI drafts');
select is((select count(*) from public.ai_mission_drafts),0::bigint,'RLS hides drafts from students');
select throws_ok($$select public.review_admin_ai_mission_draft('d3000000-0000-4000-8000-000000000001','approved')$$,'42501','ADMIN_ACCESS_REQUIRED','student cannot publish a draft');

select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.get_admin_ai_mission_drafts()),1::bigint,'admin sees pending drafts');
select ok((select public.update_admin_ai_mission_draft('d3000000-0000-4000-8000-000000000001','Assistir vídeos com segurança','Resumo revisado',generated_content) from public.ai_mission_drafts where id='d3000000-0000-4000-8000-000000000001'),'admin edits draft');
select isnt(public.review_admin_ai_mission_draft('d3000000-0000-4000-8000-000000000001','approved'),null::uuid,'approval publishes a mission');
select is((select review_status from public.ai_mission_drafts where id='d3000000-0000-4000-8000-000000000001'),'approved','draft records approval');
select is((select count(*) from public.mission_versions v join public.ai_mission_drafts d on d.published_mission_id=v.mission_id where d.id='d3000000-0000-4000-8000-000000000001' and v.status='published'),1::bigint,'approved version is published');
select is((select count(*) from public.class_mission_assignments a join public.ai_mission_drafts d on d.published_mission_id=(select mission_id from public.mission_versions where id=a.mission_version_id) where d.id='d3000000-0000-4000-8000-000000000001'),1::bigint,'published mission is assigned to active class');

select * from finish(); rollback;
