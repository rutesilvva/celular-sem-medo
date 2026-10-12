begin;

create extension if not exists pgtap with schema extensions;
select plan(2);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values (
  'c5300000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'preferences@test.invalid', '',
  now(), now(), now(), '{"provider":"google","providers":["google"]}',
  '{"name":"Preferências"}'
);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c5300000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select lives_ok(
  $$update public.preferences set reduce_motion=true,haptic_feedback=false,repeat_instructions=true,onboarding_completed_at=now() where user_id=auth.uid()$$,
  'participant updates every accessibility preference'
);
select is(
  (select count(*) from public.preferences where user_id=auth.uid() and reduce_motion and not haptic_feedback and repeat_instructions and onboarding_completed_at is not null),
  1::bigint,
  'updated accessibility preferences are persisted'
);

select * from finish();
rollback;
