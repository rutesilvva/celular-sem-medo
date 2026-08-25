begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('c1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'preferences-a@test.invalid', '', now(), now(), now(), '{}', '{"name":"Participante A"}'),
  ('c1000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'preferences-b@test.invalid', '', now(), now(), now(), '{}', '{"name":"Participante B"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is((select count(*) from public.preferences), 1::bigint, 'account reads only its default preference row');

with changed as (
  update public.preferences
  set larger_text = false, high_contrast = true, auto_audio = false,
      voice_response = true, onboarding_completed_at = now()
  where user_id = auth.uid()
  returning user_id
)
select is((select count(*) from changed), 1::bigint, 'participant updates its own preferences');

select is((select high_contrast from public.preferences where user_id = auth.uid()), true, 'preference persists for a later session');
select isnt((select onboarding_completed_at from public.preferences where user_id = auth.uid()), null, 'completed onboarding remains persisted');

with changed as (
  update public.preferences set larger_text = false
  where user_id = 'c1000000-0000-4000-8000-000000000002'
  returning user_id
)
select is((select count(*) from changed), 0::bigint, 'participant cannot update another account preferences');

select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.preferences), 1::bigint, 'another device account receives only its own preference row');

select * from finish();
rollback;
