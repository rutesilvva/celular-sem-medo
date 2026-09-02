begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('f1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ai-rate@test.invalid', '', now(), now(), now(), '{}', '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select ok((select bool_and(public.consume_ai_generation_quota()) from generate_series(1, 10)), 'first ten generations are accepted');
select is(public.consume_ai_generation_quota(), false, 'eleventh generation in the hour is rejected');
select is(has_table_privilege('authenticated', 'public.ai_generation_usage', 'select'), false, 'authenticated role cannot read quota counters');

reset role;
select set_config('request.jwt.claims', '{}', true);
select is(public.consume_ai_generation_quota(), false, 'anonymous call is rejected by function contract');

select * from finish();
rollback;
