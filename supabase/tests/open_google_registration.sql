begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('c5200000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'google-open@test.invalid', '', now(), now(), now(), '{"provider":"google","providers":["google"]}', '{"name":"Google Aberto"}'),
  ('c5200000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'password-pending@test.invalid', '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Senha Pendente"}'),
  ('c5200000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'google-unverified@test.invalid', '', null, now(), now(), '{"provider":"google","providers":["google"]}', '{"name":"Google Não Verificado"}');

select is((select account_status::text from public.profiles where id='c5200000-0000-4000-8000-000000000001'),'active','verified Google account is activated');
select is((select count(*) from public.memberships where user_id='c5200000-0000-4000-8000-000000000001' and role='participant' and status='active'),1::bigint,'verified Google account joins the public class');
select is((select account_status::text from public.profiles where id='c5200000-0000-4000-8000-000000000002'),'pending','password account stays pending');
select is((select count(*) from public.memberships where user_id='c5200000-0000-4000-8000-000000000002'),0::bigint,'password account receives no membership');
select is((select account_status::text from public.profiles where id='c5200000-0000-4000-8000-000000000003'),'pending','unverified Google account stays pending');
select is((select count(*) from public.memberships where user_id='c5200000-0000-4000-8000-000000000003'),0::bigint,'unverified Google account receives no membership');
select is((select count(*) from public.administrators where user_id in ('c5200000-0000-4000-8000-000000000001','c5200000-0000-4000-8000-000000000002','c5200000-0000-4000-8000-000000000003')),0::bigint,'self-registration never grants administrator');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c5200000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select access_roles from public.get_my_auth_context()),array['participant']::text[],'Google account resolves only participant role');

select * from finish();
rollback;
