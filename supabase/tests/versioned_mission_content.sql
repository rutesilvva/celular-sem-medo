begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('81000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'learner@mission.test', '', now(), now(), now(), '{}', '{"name":"Aprendiz"}'),
  ('81000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@mission.test', '', now(), now(), now(), '{}', '{"name":"Admin"}'),
  ('81000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@mission.test', '', now(), now(), now(), '{}', '{"name":"Outra turma"}');

update public.profiles set account_status = 'active'
where id in (
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000003'
);

insert into public.classes (id, name, slug)
values
  ('82000000-0000-4000-8000-000000000001', 'Turma Missões', 'teste-turma-missoes'),
  ('82000000-0000-4000-8000-000000000002', 'Outra Turma Missões', 'teste-outra-turma-missoes');

insert into public.memberships (class_id, user_id, role)
values
  ('82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'participant'),
  ('82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000002', 'admin'),
  ('82000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000003', 'participant');

insert into public.mission_versions (
  id, mission_id, version, status, title, description, learning_objective, content_language
)
values (
  '84000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  2,
  'draft',
  'Conferir um Pix — revisão futura',
  'Rascunho sintético usado para provar que conteúdo ainda não publicado permanece oculto.',
  'Validar a fronteira entre conteúdo publicado e rascunho.',
  'pt-BR'
);

insert into public.class_mission_assignments (
  id, class_id, mission_version_id, assigned_by, status, available_from
)
values
  ('83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000002', 'active', now() - interval '1 hour'),
  ('83000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000002', 'active', now() - interval '1 hour');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.get_participant_mission_catalog()), 1::bigint, 'participant sees only published assigned version');
select is((select title from public.get_participant_mission_catalog()), 'Enviar uma foto', 'catalog content comes from published version');
select is((select version_number from public.get_participant_mission_catalog()), 1, 'catalog exposes immutable version number');
select is((select count(*) from public.get_participant_mission_details('83000000-0000-4000-8000-000000000001')), 1::bigint, 'participant opens assigned mission');
select is((select step_count from public.get_participant_mission_details('83000000-0000-4000-8000-000000000001')), 3, 'details expose persisted step count');
select is((select count(*) from public.get_participant_mission_steps('83000000-0000-4000-8000-000000000001')), 3::bigint, 'published steps are returned');
select is((select count(*) from public.get_participant_mission_steps('83000000-0000-4000-8000-000000000001') where audio_text is null or btrim(audio_text) = ''), 0::bigint, 'every step has audio transcript');
select is((select count(*) from public.get_participant_mission_steps('83000000-0000-4000-8000-000000000001') where jsonb_array_length(hints) = 0), 0::bigint, 'every step has help content');
select is((select count(*) from public.get_participant_mission_steps('83000000-0000-4000-8000-000000000001') where btrim(safety_note) = ''), 0::bigint, 'every step has safety information');
select is((select count(*) from public.get_participant_mission_details('00000000-0000-4000-8000-000000000000')), 0::bigint, 'invalid assignment returns no content');

select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.get_participant_mission_details('83000000-0000-4000-8000-000000000001')), 0::bigint, 'participant cannot open another class assignment');

select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.get_participant_mission_catalog()), 0::bigint, 'admin does not receive participant catalog');

select * from finish();
rollback;
