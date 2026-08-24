begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('f0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'participant@secure.test', '', now(), now(), now(), '{}', '{"name":"Participante"}'),
  ('f0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'monitor@secure.test', '', now(), now(), now(), '{}', '{"name":"Monitor"}'),
  ('f0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'invited@secure.test', '', now(), now(), now(), '{}', '{"name":"Convidada"}'),
  ('f0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@secure.test', '', now(), now(), now(), '{}', '{"name":"Outra pessoa"}');

update public.profiles set account_status = 'active'
where id in ('f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002');

insert into public.classes (id, name, slug)
values ('f1000000-0000-4000-8000-000000000001', 'Turma segura', 'teste-turma-segura');

insert into public.memberships (class_id, user_id, role)
values
  ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'participant'),
  ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002', 'monitor');

insert into public.class_mission_assignments (
  id, class_id, mission_version_id, assigned_by, status, available_from
)
values (
  'f2000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'f0000000-0000-4000-8000-000000000002',
  'active', now() - interval '1 hour'
);

insert into public.attempts (
  id, participant_id, class_id, mission_version_id, assignment_id, metadata
)
values (
  'f3000000-0000-4000-8000-000000000001',
  'f0000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  '{"client_version":"0.1.0-test","resumed_count":0}'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
create temp table test_invitation as
select * from public.create_class_invitation(
  'f1000000-0000-4000-8000-000000000001',
  'invited@secure.test',
  'participant'
);

select is((select char_length(invitation_token) from test_invitation), 64, 'server creates a 256-bit hexadecimal token');
select is((select count(*) from public.list_class_invitations('f1000000-0000-4000-8000-000000000001')), 1::bigint, 'monitor lists invitation through safe RPC');
select throws_ok(
  $$select token_hash from public.invitations$$,
  '42501', null,
  'authenticated client cannot read invitation hash'
);
select throws_ok(
  $$insert into public.invitations (class_id, email, role, token_hash, invited_by, expires_at) values ('f1000000-0000-4000-8000-000000000001', 'forged@secure.test', 'participant', repeat('a', 64), 'f0000000-0000-4000-8000-000000000002', now() + interval '1 day')$$,
  '42501', null,
  'authenticated client cannot provide invitation hash'
);
select throws_ok(
  $$select * from public.create_class_invitation('f1000000-0000-4000-8000-000000000001', 'x@secure.test', 'monitor')$$,
  '42501', 'monitor can only invite participants',
  'monitor cannot create monitor invitation'
);

reset role;
select throws_ok(
  $$insert into public.invitations (class_id, email, role, token_hash, invited_by, expires_at) values ('f1000000-0000-4000-8000-000000000001', 'weak@secure.test', 'participant', repeat('a', 64), 'f0000000-0000-4000-8000-000000000002', now() + interval '8 days')$$,
  '23514', null,
  'database rejects invitation longer than seven days'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.consume_class_invitation((select invitation_token from test_invitation))$$,
  '22023', 'invalid or expired invitation',
  'token cannot be consumed by a different email'
);

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select lives_ok(
  $$select * from public.consume_class_invitation((select invitation_token from test_invitation))$$,
  'matching verified email consumes invitation'
);
select ok(public.is_account_active(), 'consuming invite activates pending account');
select ok(public.has_active_class_role('f1000000-0000-4000-8000-000000000001', 'participant'), 'consuming invite creates participant membership');
select throws_ok(
  $$select * from public.consume_class_invitation((select invitation_token from test_invitation))$$,
  '22023', 'invalid or expired invitation',
  'invitation token cannot be replayed'
);

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$update public.attempts set metadata = '{"email":"person@secure.test"}' where id = 'f3000000-0000-4000-8000-000000000001'$$,
  '23514', null,
  'attempt metadata rejects non-allowlisted PII key'
);
select throws_ok(
  $$update public.attempts set metadata = '{"client_version":"person@secure.test"}' where id = 'f3000000-0000-4000-8000-000000000001'$$,
  '23514', null,
  'allowlisted metadata key still rejects disguised email'
);
select throws_ok(
  $$select * from public.append_attempt_event('f4000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001', 1, 'attempt_started', null, now(), '{"transcript":"segredo"}')$$,
  '22023', 'event payload is not allowed',
  'event RPC rejects transcript payload'
);
select throws_ok(
  $$select * from public.append_attempt_event('f4000000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000001', 1, 'attempt_started', null, now() - interval '25 hours', '{}')$$,
  '22023', 'event timestamp outside accepted window',
  'event RPC rejects old client timestamp'
);
select is(
  (select inserted from public.append_attempt_event('f4000000-0000-4000-8000-000000000003', 'f3000000-0000-4000-8000-000000000001', 1, 'attempt_started')),
  true,
  'first event request inserts'
);
select is(
  (select inserted from public.append_attempt_event('f4000000-0000-4000-8000-000000000003', 'f3000000-0000-4000-8000-000000000001', 1, 'attempt_started')),
  false,
  'retry with same event ID is idempotent'
);
select cmp_ok(
  (select abs(extract(epoch from (recorded_at - now()))) from public.attempt_events where id = 'f4000000-0000-4000-8000-000000000003'),
  '<=', 2::numeric,
  'recorded_at is generated by server'
);
select throws_ok(
  $$insert into public.attempt_events (attempt_id, participant_id, mission_version_id, class_id, sequence_number, event_type) values ('f3000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 2, 'step_viewed')$$,
  '42501', null,
  'client cannot bypass event RPC with direct insert'
);
select throws_ok(
  $$insert into public.help_requests (class_id, participant_id, message) values ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'texto livre')$$,
  '23514', null,
  'help request rejects free text'
);

reset role;
insert into public.invitations (
  id, class_id, email, role, token_hash, invited_by, created_at, expires_at
)
values (
  'f5000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'expired@secure.test',
  'participant', repeat('b', 64),
  'f0000000-0000-4000-8000-000000000002',
  now() - interval '8 days', now() - interval '1 day'
);
select is(public.expire_invitation_secrets(), 1, 'expiration routine removes expired token hash');

update public.invitations
set revoked_at = now() - interval '31 days', token_hash = null
where id = 'f5000000-0000-4000-8000-000000000001';
select is(public.purge_closed_invitation_personal_data(), 1, 'retention routine removes closed invitation email after 30 days');
select is(
  (select count(*) from cron.job where jobname in ('csm-expire-invitation-secrets', 'csm-purge-invitation-personal-data')),
  2::bigint,
  'both invitation retention jobs are scheduled'
);

select * from finish();
rollback;
