begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('71000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'participant@class.test', '', now(), now(), now(), '{}', '{"name":"Participante Real"}'),
  ('71000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@class.test', '', now(), now(), now(), '{}', '{"name":"Admin A"}'),
  ('71000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-b@class.test', '', now(), now(), now(), '{}', '{"name":"Admin B"}');

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
  ('72000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000003', 'participant');

insert into public.administrators(user_id,status)
values ('71000000-0000-4000-8000-000000000002','active');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.get_my_class_contexts()), 1::bigint, 'student receives only active student classes');
select is((select count(distinct access_role) from public.get_my_class_contexts()), 1::bigint, 'class context exposes only participant role');
select is((select count(*) from public.profiles where id = auth.uid()), 1::bigint, 'authorization does not duplicate the Google identity');
select throws_ok(
  $$select * from public.get_admin_class_participants('72000000-0000-4000-8000-000000000001')$$,
  '42501', 'admin access required', 'participant cannot list classmates'
);

select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.get_admin_class_contexts()), 2::bigint, 'global admin loads every active class');
select is((select count(*) from public.get_admin_class_participants('72000000-0000-4000-8000-000000000001')), 1::bigint, 'admin lists own active participants');
select is((select display_name from public.get_admin_class_participants('72000000-0000-4000-8000-000000000001')), 'Participante Real', 'participant identity comes from profile');
select is((select count(*) from public.get_admin_participant('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001')), 1::bigint, 'admin opens participant in own class');
select is((select count(*) from public.get_admin_participant('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000003')), 0::bigint, 'participant from another class is not disclosed');
select is((select count(*) from public.get_admin_class_participants('72000000-0000-4000-8000-000000000002')), 1::bigint, 'global admin can query another class');

reset role;
update public.memberships set status = 'inactive', ended_at = now()
where class_id = '72000000-0000-4000-8000-000000000001'
  and user_id = '71000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.get_admin_class_participants('72000000-0000-4000-8000-000000000001')), 0::bigint, 'inactive participant disappears immediately');

reset role;
update public.classes set status = 'archived' where id = '72000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.get_admin_class_contexts()), 1::bigint, 'archived class is absent from global admin contexts');

select * from finish();
rollback;
