begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('71000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'participant@class.test', '', now(), now(), now(), '{}', '{"name":"Participante Real"}'),
  ('71000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'monitor-a@class.test', '', now(), now(), now(), '{}', '{"name":"Monitor A"}'),
  ('71000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'monitor-b@class.test', '', now(), now(), now(), '{}', '{"name":"Monitor B"}');

update public.profiles set account_status = 'active'
where id in (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000003'
);

insert into public.classes (id, name, slug, shift)
values
  ('72000000-0000-4000-8000-000000000001', 'Turma Persistida A', 'persistida-a', 'manhã'),
  ('72000000-0000-4000-8000-000000000002', 'Turma Persistida B', 'persistida-b', 'tarde');

insert into public.memberships (class_id, user_id, role)
values
  ('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'participant'),
  ('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000002', 'monitor'),
  ('72000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000001', 'monitor'),
  ('72000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000003', 'participant');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.get_my_class_contexts()), 2::bigint, 'one identity can have two class roles');
select is((select count(distinct access_role) from public.get_my_class_contexts()), 2::bigint, 'both persisted roles are returned');
select is((select count(*) from public.profiles where id = auth.uid()), 1::bigint, 'roles do not duplicate the Google identity');
select throws_ok(
  $$select * from public.get_monitor_class_participants('72000000-0000-4000-8000-000000000001')$$,
  '42501', 'monitor access required', 'participant cannot list classmates'
);

select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select class_name from public.get_my_class_contexts()), 'Turma Persistida A', 'monitor loads persisted class');
select is((select count(*) from public.get_monitor_class_participants('72000000-0000-4000-8000-000000000001')), 1::bigint, 'monitor lists own active participants');
select is((select display_name from public.get_monitor_class_participants('72000000-0000-4000-8000-000000000001')), 'Participante Real', 'participant identity comes from profile');
select is((select count(*) from public.get_monitor_participant('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001')), 1::bigint, 'monitor opens participant in own class');
select is((select count(*) from public.get_monitor_participant('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000003')), 0::bigint, 'participant from another class is not disclosed');
select throws_ok(
  $$select * from public.get_monitor_class_participants('72000000-0000-4000-8000-000000000002')$$,
  '42501', 'monitor access required', 'monitor cannot query another class'
);

reset role;
update public.memberships set status = 'inactive', ended_at = now()
where class_id = '72000000-0000-4000-8000-000000000001'
  and user_id = '71000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.get_monitor_class_participants('72000000-0000-4000-8000-000000000001')), 0::bigint, 'inactive participant disappears immediately');

reset role;
update public.classes set status = 'archived' where id = '72000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.get_my_class_contexts()), 0::bigint, 'archived class is absent from active contexts');

select * from finish();
rollback;
