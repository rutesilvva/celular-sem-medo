begin;

create extension if not exists pg_cron with schema pg_catalog;

alter table public.memberships
  add constraint memberships_one_role_per_class_user_key
  unique using index memberships_one_role_per_class_user_idx;

drop policy invitations_select_monitors on public.invitations;
drop policy invitations_insert_participant_by_monitor on public.invitations;
drop policy invitations_select_global_admin on public.invitations;

revoke all privileges on table public.invitations from authenticated;

alter table public.invitations
  alter column email drop not null,
  alter column token_hash drop not null,
  drop constraint invitations_token_hash_format,
  drop constraint invitations_expiry_after_creation,
  add constraint invitations_token_hash_format check (
    token_hash is null or token_hash ~ '^[0-9a-f]{64}$'
  ),
  add constraint invitations_expiry_window check (
    expires_at > created_at and expires_at <= created_at + interval '7 days'
  ),
  add constraint invitations_terminal_token_removed check (
    (accepted_at is null and revoked_at is null) or token_hash is null
  ),
  add constraint invitations_pending_email_present check (
    accepted_at is not null or revoked_at is not null or email is not null
  );

create or replace function public.create_class_invitation(
  target_class_id uuid,
  invited_email text,
  invited_role public.app_role default 'participant'
)
returns table (invitation_id uuid, invitation_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(invited_email));
  plain_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if not public.is_account_active() then
    raise exception 'active account required' using errcode = '42501';
  end if;
  if not public.is_global_admin() and not public.is_class_monitor(target_class_id) then
    raise exception 'class management access required' using errcode = '42501';
  end if;
  if not public.is_global_admin() and invited_role <> 'participant' then
    raise exception 'monitor can only invite participants' using errcode = '42501';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(normalized_email) > 320 then
    raise exception 'invalid invitation email' using errcode = '22023';
  end if;

  return query
  insert into public.invitations (
    class_id,
    email,
    role,
    token_hash,
    invited_by,
    expires_at
  )
  values (
    target_class_id,
    normalized_email,
    invited_role,
    encode(extensions.digest(plain_token, 'sha256'), 'hex'),
    (select auth.uid()),
    now() + interval '7 days'
  )
  returning invitations.id, plain_token, invitations.expires_at;
end;
$$;

create or replace function public.list_class_invitations(target_class_id uuid)
returns table (
  invitation_id uuid,
  email text,
  role public.app_role,
  status text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_global_admin() and not public.is_class_monitor(target_class_id) then
    raise exception 'class management access required' using errcode = '42501';
  end if;

  return query
  select
    invitation.id,
    coalesce(invitation.email, ''),
    invitation.role,
    case
      when invitation.accepted_at is not null then 'accepted'
      when invitation.revoked_at is not null then 'revoked'
      when invitation.expires_at <= now() then 'expired'
      else 'pending'
    end,
    invitation.expires_at,
    invitation.created_at
  from public.invitations invitation
  where invitation.class_id = target_class_id
  order by invitation.created_at desc;
end;
$$;

create or replace function public.consume_class_invitation(plain_token text)
returns table (class_id uuid, access_role public.app_role)
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_invitation public.invitations%rowtype;
  verified_email text;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if plain_token !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid or expired invitation' using errcode = '22023';
  end if;

  select lower(user_record.email)
  into verified_email
  from auth.users user_record
  where user_record.id = (select auth.uid())
    and user_record.email_confirmed_at is not null;

  if verified_email is null then
    raise exception 'verified email required' using errcode = '42501';
  end if;

  select invitation.*
  into matched_invitation
  from public.invitations invitation
  join public.classes class on class.id = invitation.class_id
  where invitation.token_hash = encode(extensions.digest(plain_token, 'sha256'), 'hex')
    and invitation.email = verified_email
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > now()
    and class.status = 'active'
  for update of invitation;

  if not found then
    raise exception 'invalid or expired invitation' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.profiles profile
    where profile.id = (select auth.uid()) and profile.account_status = 'blocked'
  ) then
    raise exception 'blocked account' using errcode = '42501';
  end if;

  insert into public.memberships (class_id, user_id, role)
  values (matched_invitation.class_id, (select auth.uid()), matched_invitation.role)
  on conflict on constraint memberships_one_role_per_class_user_key do update
  set
    role = excluded.role,
    status = 'active',
    ended_at = null,
    updated_at = now();

  update public.profiles
  set account_status = 'active'
  where id = (select auth.uid()) and account_status = 'pending';

  update public.invitations invitation
  set
    accepted_at = now(),
    accepted_by = (select auth.uid()),
    token_hash = null,
    updated_at = now()
  where invitation.id = matched_invitation.id;

  return query select matched_invitation.class_id, matched_invitation.role;
end;
$$;

create or replace function public.expire_invitation_secrets()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.invitations invitation
  set token_hash = null, updated_at = now()
  where invitation.expires_at <= now() and invitation.token_hash is not null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function public.purge_closed_invitation_personal_data()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.invitations invitation
  set email = null, token_hash = null, updated_at = now()
  where invitation.email is not null
    and coalesce(invitation.accepted_at, invitation.revoked_at, invitation.expires_at) <= now() - interval '30 days';
  get diagnostics affected = row_count;
  return affected;
end;
$$;

select cron.schedule(
  'csm-expire-invitation-secrets',
  '15 * * * *',
  'select public.expire_invitation_secrets()'
);

select cron.schedule(
  'csm-purge-invitation-personal-data',
  '25 3 * * *',
  'select public.purge_closed_invitation_personal_data()'
);

create or replace function public.is_safe_attempt_metadata(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(value) = 'object'
    and octet_length(value::text) <= 512
    and not exists (
      select 1 from jsonb_object_keys(value) key
      where key not in ('client_version', 'resumed_count')
    )
    and (
      not (value ? 'client_version')
      or (
        jsonb_typeof(value -> 'client_version') = 'string'
        and char_length(value ->> 'client_version') <= 40
        and (value ->> 'client_version') ~ '^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$'
      )
    )
    and (
      not (value ? 'resumed_count')
      or (
        jsonb_typeof(value -> 'resumed_count') = 'number'
        and (value ->> 'resumed_count')::numeric between 0 and 100
        and trunc((value ->> 'resumed_count')::numeric) = (value ->> 'resumed_count')::numeric
      )
    );
$$;

alter table public.attempts
  add constraint attempts_metadata_allowlist check (public.is_safe_attempt_metadata(metadata));

alter table public.attempt_events
  add constraint attempt_events_empty_payload check (payload = '{}'::jsonb);

alter table public.help_requests
  add constraint help_requests_no_free_text check (message is null and resolution_note is null);

create or replace function public.enforce_attempt_event_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner_id uuid;
  owner_class_id uuid;
  owner_version_id uuid;
begin
  if tg_op <> 'INSERT' then
    raise exception 'attempt events are append-only';
  end if;

  if (select auth.uid()) is not null then
    select attempt.participant_id, attempt.class_id, attempt.mission_version_id
    into owner_id, owner_class_id, owner_version_id
    from public.attempts attempt
    where attempt.id = new.attempt_id
      and attempt.participant_id = (select auth.uid())
      and public.has_active_class_role(attempt.class_id, 'participant');

    if not found then
      raise exception 'attempt access required' using errcode = '42501';
    end if;
    if new.occurred_at < now() - interval '24 hours' or new.occurred_at > now() + interval '5 minutes' then
      raise exception 'event timestamp outside accepted window' using errcode = '22023';
    end if;

    new.participant_id := owner_id;
    new.class_id := owner_class_id;
    new.mission_version_id := owner_version_id;
    new.recorded_at := now();
  end if;
  return new;
end;
$$;

create trigger attempt_events_enforce_write
  before insert or update on public.attempt_events
  for each row execute function public.enforce_attempt_event_write();

create or replace function public.append_attempt_event(
  event_id uuid,
  target_attempt_id uuid,
  target_sequence_number integer,
  target_event_type public.attempt_event_type,
  target_step_id uuid default null,
  event_occurred_at timestamptz default now(),
  event_payload jsonb default '{}'::jsonb
)
returns table (stored_event_id uuid, inserted boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
  stored public.attempt_events%rowtype;
begin
  if event_payload <> '{}'::jsonb then
    raise exception 'event payload is not allowed' using errcode = '22023';
  end if;

  insert into public.attempt_events (
    id, attempt_id, participant_id, mission_version_id, class_id, step_id,
    sequence_number, event_type, payload, occurred_at
  )
  select
    event_id, attempt.id, attempt.participant_id, attempt.mission_version_id,
    attempt.class_id, target_step_id, target_sequence_number, target_event_type,
    '{}'::jsonb, event_occurred_at
  from public.attempts attempt
  where attempt.id = target_attempt_id
    and attempt.participant_id = (select auth.uid())
  on conflict (id) do nothing;

  get diagnostics inserted_count = row_count;

  select event.* into stored
  from public.attempt_events event
  where event.id = event_id;

  if stored.id is null
    or stored.attempt_id <> target_attempt_id
    or stored.participant_id <> (select auth.uid())
    or stored.sequence_number <> target_sequence_number
    or stored.event_type <> target_event_type
    or stored.step_id is distinct from target_step_id
    or stored.occurred_at <> event_occurred_at then
    raise exception 'event idempotency conflict' using errcode = '22023';
  end if;

  return query select stored.id, inserted_count = 1;
end;
$$;

drop policy attempt_events_insert_owner on public.attempt_events;
revoke insert on table public.attempt_events from authenticated;

revoke all on function public.create_class_invitation(uuid, text, public.app_role) from public;
revoke all on function public.list_class_invitations(uuid) from public;
revoke all on function public.consume_class_invitation(text) from public;
revoke all on function public.expire_invitation_secrets() from public;
revoke all on function public.purge_closed_invitation_personal_data() from public;
revoke all on function public.append_attempt_event(uuid, uuid, integer, public.attempt_event_type, uuid, timestamptz, jsonb) from public;
revoke all on function public.enforce_attempt_event_write() from public;

grant execute on function public.create_class_invitation(uuid, text, public.app_role) to authenticated;
grant execute on function public.list_class_invitations(uuid) to authenticated;
grant execute on function public.consume_class_invitation(text) to authenticated;
grant execute on function public.append_attempt_event(uuid, uuid, integer, public.attempt_event_type, uuid, timestamptz, jsonb) to authenticated;
grant execute on function public.expire_invitation_secrets() to service_role;
grant execute on function public.purge_closed_invitation_personal_data() to service_role;

commit;
