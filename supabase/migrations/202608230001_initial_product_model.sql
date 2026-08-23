begin;

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('participant', 'monitor');
create type public.class_status as enum ('active', 'archived');
create type public.membership_status as enum ('active', 'inactive');
create type public.mission_catalog_status as enum ('active', 'archived');
create type public.mission_version_status as enum ('draft', 'published', 'retired');
create type public.mission_difficulty as enum ('easy', 'medium', 'hard');
create type public.mission_step_type as enum (
  'instruction',
  'tap_target',
  'multiple_choice',
  'confirmation',
  'simulation'
);
create type public.assignment_status as enum ('scheduled', 'active', 'archived');
create type public.attempt_status as enum ('in_progress', 'completed', 'abandoned');
create type public.attempt_event_type as enum (
  'attempt_started',
  'attempt_resumed',
  'step_viewed',
  'action_succeeded',
  'action_failed',
  'hint_requested',
  'audio_started',
  'audio_completed',
  'voice_response_started',
  'voice_response_completed',
  'help_requested',
  'attempt_completed',
  'attempt_abandoned'
);
create type public.help_request_status as enum ('open', 'in_progress', 'resolved', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 120),
  constraint profiles_avatar_url_length check (avatar_url is null or char_length(avatar_url) <= 2048)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  shift text,
  status public.class_status not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint classes_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint classes_shift_length check (shift is null or char_length(shift) <= 80)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_class_user_role_key unique (class_id, user_id, role),
  constraint memberships_status_dates check (
    (status = 'active' and ended_at is null)
    or (status = 'inactive' and ended_at is not null)
  ),
  constraint memberships_ended_after_joined check (ended_at is null or ended_at >= joined_at)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  email text not null,
  role public.app_role not null default 'participant',
  token_hash text not null unique,
  invited_by uuid not null references public.profiles (id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_email_normalized check (
    email = lower(btrim(email))
    and char_length(email) between 3 and 320
    and position('@' in email) > 1
  ),
  constraint invitations_token_hash_format check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint invitations_expiry_after_creation check (expires_at > created_at),
  constraint invitations_acceptance_pair check (
    (accepted_at is null and accepted_by is null)
    or (accepted_at is not null and accepted_by is not null)
  ),
  constraint invitations_terminal_state check (not (accepted_at is not null and revoked_at is not null))
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  category text not null,
  difficulty public.mission_difficulty not null,
  estimated_minutes smallint not null,
  status public.mission_catalog_status not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint missions_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint missions_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint missions_summary_length check (char_length(btrim(summary)) between 1 and 1000),
  constraint missions_category_length check (char_length(btrim(category)) between 1 and 100),
  constraint missions_estimated_minutes_range check (estimated_minutes between 1 and 180)
);

create table public.mission_versions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  version integer not null,
  status public.mission_version_status not null default 'draft',
  title text not null,
  description text not null,
  learning_objective text not null,
  content_language text not null default 'pt-BR',
  changelog text,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mission_versions_mission_version_key unique (mission_id, version),
  constraint mission_versions_version_positive check (version > 0),
  constraint mission_versions_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint mission_versions_description_length check (char_length(btrim(description)) between 1 and 4000),
  constraint mission_versions_objective_length check (char_length(btrim(learning_objective)) between 1 and 1000),
  constraint mission_versions_language_format check (content_language ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  constraint mission_versions_publication_state check (
    (status = 'draft' and published_at is null)
    or (status in ('published', 'retired') and published_at is not null)
  )
);

create table public.mission_steps (
  id uuid primary key default gen_random_uuid(),
  mission_version_id uuid not null references public.mission_versions (id) on delete cascade,
  position smallint not null,
  step_type public.mission_step_type not null,
  title text not null,
  instruction text not null,
  audio_text text,
  expected_action jsonb not null default '{}'::jsonb,
  options jsonb not null default '[]'::jsonb,
  hints jsonb not null default '[]'::jsonb,
  is_optional boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mission_steps_version_position_key unique (mission_version_id, position),
  constraint mission_steps_id_version_key unique (id, mission_version_id),
  constraint mission_steps_position_positive check (position > 0),
  constraint mission_steps_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint mission_steps_instruction_length check (char_length(btrim(instruction)) between 1 and 4000),
  constraint mission_steps_audio_text_length check (audio_text is null or char_length(audio_text) <= 4000),
  constraint mission_steps_expected_action_object check (jsonb_typeof(expected_action) = 'object'),
  constraint mission_steps_options_array check (jsonb_typeof(options) = 'array'),
  constraint mission_steps_hints_array check (jsonb_typeof(hints) = 'array')
);

create table public.class_mission_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete restrict,
  mission_version_id uuid not null references public.mission_versions (id) on delete restrict,
  assigned_by uuid not null,
  assigned_by_role public.app_role not null default 'monitor',
  status public.assignment_status not null default 'active',
  is_required boolean not null default false,
  available_from timestamptz not null default now(),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_mission_assignments_class_version_key unique (class_id, mission_version_id),
  constraint class_mission_assignments_id_scope_key unique (id, class_id, mission_version_id),
  constraint class_mission_assignments_monitor_role check (assigned_by_role = 'monitor'),
  constraint class_mission_assignments_due_after_available check (due_at is null or due_at > available_from),
  constraint class_mission_assignments_monitor_membership_fk
    foreign key (class_id, assigned_by, assigned_by_role)
    references public.memberships (class_id, user_id, role)
    on delete restrict
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null,
  participant_role public.app_role not null default 'participant',
  class_id uuid not null,
  mission_version_id uuid not null,
  assignment_id uuid not null,
  current_step_id uuid,
  status public.attempt_status not null default 'in_progress',
  score numeric(5, 2),
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attempts_id_participant_version_key unique (id, participant_id, mission_version_id),
  constraint attempts_id_participant_class_version_key unique (id, participant_id, class_id, mission_version_id),
  constraint attempts_participant_role check (participant_role = 'participant'),
  constraint attempts_score_range check (score is null or score between 0 and 100),
  constraint attempts_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint attempts_completion_state check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  ),
  constraint attempts_completed_after_started check (completed_at is null or completed_at >= started_at),
  constraint attempts_activity_after_started check (last_activity_at >= started_at),
  constraint attempts_participant_membership_fk
    foreign key (class_id, participant_id, participant_role)
    references public.memberships (class_id, user_id, role)
    on delete restrict,
  constraint attempts_assignment_scope_fk
    foreign key (assignment_id, class_id, mission_version_id)
    references public.class_mission_assignments (id, class_id, mission_version_id)
    on delete restrict,
  constraint attempts_current_step_version_fk
    foreign key (current_step_id, mission_version_id)
    references public.mission_steps (id, mission_version_id)
    on delete restrict
);

create table public.attempt_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null,
  participant_id uuid not null,
  mission_version_id uuid not null,
  class_id uuid not null,
  step_id uuid,
  sequence_number integer not null,
  event_type public.attempt_event_type not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  constraint attempt_events_attempt_sequence_key unique (attempt_id, sequence_number),
  constraint attempt_events_sequence_positive check (sequence_number > 0),
  constraint attempt_events_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint attempt_events_attempt_scope_fk
    foreign key (attempt_id, participant_id, class_id, mission_version_id)
    references public.attempts (id, participant_id, class_id, mission_version_id)
    on delete cascade,
  constraint attempt_events_step_version_fk
    foreign key (step_id, mission_version_id)
    references public.mission_steps (id, mission_version_id)
    on delete restrict
);

create table public.preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  larger_text boolean not null default true,
  high_contrast boolean not null default false,
  auto_audio boolean not null default true,
  voice_response boolean not null default false,
  audio_rate numeric(3, 2) not null default 1.00,
  locale text not null default 'pt-BR',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint preferences_audio_rate_range check (audio_rate between 0.50 and 2.00),
  constraint preferences_locale_format check (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$')
);

create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  participant_id uuid not null,
  participant_role public.app_role not null default 'participant',
  attempt_id uuid,
  mission_version_id uuid,
  step_id uuid,
  assigned_monitor_id uuid,
  assigned_monitor_role public.app_role not null default 'monitor',
  status public.help_request_status not null default 'open',
  message text,
  resolution_note text,
  requested_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint help_requests_participant_role check (participant_role = 'participant'),
  constraint help_requests_monitor_role check (assigned_monitor_role = 'monitor'),
  constraint help_requests_message_length check (message is null or char_length(btrim(message)) between 1 and 1000),
  constraint help_requests_resolution_length check (resolution_note is null or char_length(btrim(resolution_note)) between 1 and 4000),
  constraint help_requests_attempt_context check (
    (attempt_id is null and mission_version_id is null and step_id is null)
    or (attempt_id is not null and mission_version_id is not null)
  ),
  constraint help_requests_status_dates check (
    (status = 'open' and acknowledged_at is null and resolved_at is null)
    or (status = 'in_progress' and acknowledged_at is not null and resolved_at is null)
    or (status = 'resolved' and acknowledged_at is not null and resolved_at is not null)
    or (status = 'cancelled' and resolved_at is not null)
  ),
  constraint help_requests_acknowledged_after_requested check (acknowledged_at is null or acknowledged_at >= requested_at),
  constraint help_requests_resolved_after_requested check (resolved_at is null or resolved_at >= requested_at),
  constraint help_requests_participant_membership_fk
    foreign key (class_id, participant_id, participant_role)
    references public.memberships (class_id, user_id, role)
    on delete restrict,
  constraint help_requests_assigned_monitor_membership_fk
    foreign key (class_id, assigned_monitor_id, assigned_monitor_role)
    references public.memberships (class_id, user_id, role)
    on delete restrict,
  constraint help_requests_attempt_scope_fk
    foreign key (attempt_id, participant_id, class_id, mission_version_id)
    references public.attempts (id, participant_id, class_id, mission_version_id)
    on delete restrict,
  constraint help_requests_step_version_fk
    foreign key (step_id, mission_version_id)
    references public.mission_steps (id, mission_version_id)
    on delete restrict
);

create index classes_created_by_idx on public.classes (created_by) where created_by is not null;
create index classes_status_idx on public.classes (status);
create index memberships_user_status_idx on public.memberships (user_id, status);
create index memberships_class_role_status_idx on public.memberships (class_id, role, status);
create index invitations_class_created_idx on public.invitations (class_id, created_at desc);
create index invitations_email_idx on public.invitations (email);
create index invitations_open_idx on public.invitations (class_id, expires_at)
  where accepted_at is null and revoked_at is null;
create index missions_catalog_idx on public.missions (status, category, difficulty);
create index mission_versions_mission_status_idx on public.mission_versions (mission_id, status, version desc);
create unique index mission_versions_one_published_idx on public.mission_versions (mission_id)
  where status = 'published';
create index mission_steps_version_position_idx on public.mission_steps (mission_version_id, position);
create index assignments_class_status_available_idx
  on public.class_mission_assignments (class_id, status, available_from);
create index assignments_version_idx on public.class_mission_assignments (mission_version_id);
create index attempts_participant_status_started_idx
  on public.attempts (participant_id, status, started_at desc);
create index attempts_class_started_idx on public.attempts (class_id, started_at desc);
create index attempts_version_status_idx on public.attempts (mission_version_id, status);
create index attempts_assignment_idx on public.attempts (assignment_id);
create unique index attempts_one_in_progress_idx
  on public.attempts (participant_id, assignment_id)
  where status = 'in_progress';
create index attempt_events_attempt_sequence_idx on public.attempt_events (attempt_id, sequence_number);
create index attempt_events_class_occurred_idx on public.attempt_events (class_id, occurred_at desc);
create index attempt_events_participant_occurred_idx on public.attempt_events (participant_id, occurred_at desc);
create index attempt_events_type_occurred_idx on public.attempt_events (event_type, occurred_at desc);
create index help_requests_class_status_requested_idx
  on public.help_requests (class_id, status, requested_at desc);
create index help_requests_participant_requested_idx
  on public.help_requests (participant_id, requested_at desc);
create index help_requests_monitor_status_idx
  on public.help_requests (assigned_monitor_id, status)
  where assigned_monitor_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  derived_name text;
  derived_avatar text;
begin
  derived_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Pessoa usuária'
  );
  derived_avatar := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'picture'), '')
  );

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, left(derived_name, 120), left(derived_avatar, 2048))
  on conflict (id) do nothing;

  insert into public.preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.has_active_class_role(
  target_class_id uuid,
  required_role public.app_role default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships membership
    where membership.class_id = target_class_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (required_role is null or membership.role = required_role)
  );
$$;

create or replace function public.is_active_class_member(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_active_class_role(target_class_id, null);
$$;

create or replace function public.is_class_monitor(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_active_class_role(target_class_id, 'monitor');
$$;

create or replace function public.can_monitor_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships viewer
    join public.memberships target on target.class_id = viewer.class_id
    where viewer.user_id = (select auth.uid())
      and viewer.role = 'monitor'
      and viewer.status = 'active'
      and target.user_id = target_user_id
      and target.status = 'active'
  );
$$;

create or replace function public.is_published_mission_version(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.mission_versions version
    join public.missions mission on mission.id = version.mission_id
    where version.id = target_version_id
      and version.status = 'published'
      and mission.status = 'active'
  );
$$;

create or replace function public.is_assignment_available(
  target_assignment_id uuid,
  target_class_id uuid,
  target_version_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_mission_assignments assignment
    where assignment.id = target_assignment_id
      and assignment.class_id = target_class_id
      and assignment.mission_version_id = target_version_id
      and assignment.status = 'active'
      and assignment.available_from <= now()
      and (assignment.due_at is null or assignment.due_at >= now())
      and public.is_published_mission_version(assignment.mission_version_id)
  );
$$;

create or replace function public.enforce_assignment_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(new.id, new.class_id, new.mission_version_id, new.assigned_by, new.created_at)
    is distinct from row(old.id, old.class_id, old.mission_version_id, old.assigned_by, old.created_at) then
    raise exception 'assignment identity fields are immutable';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_attempt_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.participant_id := auth.uid();
      new.participant_role := 'participant';
      new.status := 'in_progress';
      new.score := null;
      new.started_at := now();
      new.last_activity_at := new.started_at;
      new.completed_at := null;
    end if;
    return new;
  end if;

  if row(new.id, new.participant_id, new.participant_role, new.class_id, new.mission_version_id, new.assignment_id, new.started_at, new.created_at)
    is distinct from row(old.id, old.participant_id, old.participant_role, old.class_id, old.mission_version_id, old.assignment_id, old.started_at, old.created_at) then
    raise exception 'attempt identity fields are immutable';
  end if;

  if old.status in ('completed', 'abandoned') and new.status is distinct from old.status then
    raise exception 'a closed attempt cannot be reopened';
  end if;

  if auth.uid() is not null and new.score is distinct from old.score then
    raise exception 'attempt score is server-managed';
  end if;

  if new.status = 'completed' then
    new.completed_at := coalesce(old.completed_at, now());
  else
    new.completed_at := null;
  end if;

  new.last_activity_at := now();
  return new;
end;
$$;

create or replace function public.enforce_help_request_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.participant_id := auth.uid();
      new.participant_role := 'participant';
      new.assigned_monitor_id := null;
      new.assigned_monitor_role := 'monitor';
      new.status := 'open';
      new.acknowledged_at := null;
      new.resolved_at := null;
      new.resolution_note := null;
      new.requested_at := now();
    end if;
    return new;
  end if;

  if row(new.id, new.class_id, new.participant_id, new.participant_role, new.attempt_id, new.mission_version_id, new.step_id, new.message, new.requested_at, new.created_at)
    is distinct from row(old.id, old.class_id, old.participant_id, old.participant_role, old.attempt_id, old.mission_version_id, old.step_id, old.message, old.requested_at, old.created_at) then
    raise exception 'help request identity and original message are immutable';
  end if;

  if old.status in ('resolved', 'cancelled') and new.status is distinct from old.status then
    raise exception 'a closed help request cannot be reopened';
  end if;

  if new.status = 'open' then
    new.acknowledged_at := null;
    new.resolved_at := null;
  elsif new.status = 'in_progress' then
    new.acknowledged_at := coalesce(old.acknowledged_at, now());
    new.resolved_at := null;
  elsif new.status = 'resolved' then
    new.acknowledged_at := coalesce(old.acknowledged_at, now());
    new.resolved_at := coalesce(old.resolved_at, now());
  elsif new.status = 'cancelled' then
    new.resolved_at := coalesce(old.resolved_at, now());
  end if;

  return new;
end;
$$;

insert into public.profiles (id, display_name, avatar_url)
select
  user_record.id,
  left(coalesce(
    nullif(btrim(user_record.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(user_record.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(user_record.email, ''), '@', 1), ''),
    'Pessoa usuária'
  ), 120),
  left(coalesce(
    nullif(btrim(user_record.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(btrim(user_record.raw_user_meta_data ->> 'picture'), '')
  ), 2048)
from auth.users user_record
on conflict (id) do nothing;

insert into public.preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

drop trigger if exists on_csm_auth_user_created on auth.users;
create trigger on_csm_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger classes_set_updated_at before update on public.classes
  for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();
create trigger invitations_set_updated_at before update on public.invitations
  for each row execute function public.set_updated_at();
create trigger missions_set_updated_at before update on public.missions
  for each row execute function public.set_updated_at();
create trigger mission_versions_set_updated_at before update on public.mission_versions
  for each row execute function public.set_updated_at();
create trigger mission_steps_set_updated_at before update on public.mission_steps
  for each row execute function public.set_updated_at();
create trigger assignments_enforce_identity before update on public.class_mission_assignments
  for each row execute function public.enforce_assignment_identity();
create trigger assignments_set_updated_at before update on public.class_mission_assignments
  for each row execute function public.set_updated_at();
create trigger attempts_enforce_write before insert or update on public.attempts
  for each row execute function public.enforce_attempt_write();
create trigger attempts_set_updated_at before update on public.attempts
  for each row execute function public.set_updated_at();
create trigger preferences_set_updated_at before update on public.preferences
  for each row execute function public.set_updated_at();
create trigger help_requests_enforce_write before insert or update on public.help_requests
  for each row execute function public.enforce_help_request_write();
create trigger help_requests_set_updated_at before update on public.help_requests
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.missions enable row level security;
alter table public.mission_versions enable row level security;
alter table public.mission_steps enable row level security;
alter table public.class_mission_assignments enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_events enable row level security;
alter table public.preferences enable row level security;
alter table public.help_requests enable row level security;

create policy profiles_select_own_or_monitored
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.can_monitor_user(id));
create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy classes_select_members
  on public.classes for select to authenticated
  using (public.is_active_class_member(id));
create policy classes_update_monitors
  on public.classes for update to authenticated
  using (public.is_class_monitor(id))
  with check (public.is_class_monitor(id));

create policy memberships_select_self_or_monitor
  on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or public.is_class_monitor(class_id));

create policy invitations_select_monitors
  on public.invitations for select to authenticated
  using (public.is_class_monitor(class_id));
create policy invitations_insert_participant_by_monitor
  on public.invitations for insert to authenticated
  with check (
    public.is_class_monitor(class_id)
    and invited_by = (select auth.uid())
    and role = 'participant'
    and accepted_at is null
    and accepted_by is null
    and revoked_at is null
    and expires_at > now()
  );

create policy missions_select_active
  on public.missions for select to authenticated
  using (status = 'active');
create policy mission_versions_select_published
  on public.mission_versions for select to authenticated
  using (public.is_published_mission_version(id));
create policy mission_steps_select_published
  on public.mission_steps for select to authenticated
  using (public.is_published_mission_version(mission_version_id));

create policy assignments_select_members
  on public.class_mission_assignments for select to authenticated
  using (public.is_active_class_member(class_id));
create policy assignments_insert_monitors
  on public.class_mission_assignments for insert to authenticated
  with check (
    public.is_class_monitor(class_id)
    and assigned_by = (select auth.uid())
    and assigned_by_role = 'monitor'
    and public.is_published_mission_version(mission_version_id)
  );
create policy assignments_update_monitors
  on public.class_mission_assignments for update to authenticated
  using (public.is_class_monitor(class_id))
  with check (
    public.is_class_monitor(class_id)
    and public.is_published_mission_version(mission_version_id)
  );
create policy assignments_delete_monitors
  on public.class_mission_assignments for delete to authenticated
  using (public.is_class_monitor(class_id));

create policy attempts_select_owner_or_monitor
  on public.attempts for select to authenticated
  using (
    participant_id = (select auth.uid())
    or public.is_class_monitor(class_id)
  );
create policy attempts_insert_owner
  on public.attempts for insert to authenticated
  with check (
    participant_id = (select auth.uid())
    and participant_role = 'participant'
    and public.has_active_class_role(class_id, 'participant')
    and public.is_assignment_available(assignment_id, class_id, mission_version_id)
  );
create policy attempts_update_owner
  on public.attempts for update to authenticated
  using (
    participant_id = (select auth.uid())
    and public.has_active_class_role(class_id, 'participant')
  )
  with check (
    participant_id = (select auth.uid())
    and public.has_active_class_role(class_id, 'participant')
  );

create policy attempt_events_select_owner_or_monitor
  on public.attempt_events for select to authenticated
  using (
    participant_id = (select auth.uid())
    or public.is_class_monitor(class_id)
  );
create policy attempt_events_insert_owner
  on public.attempt_events for insert to authenticated
  with check (
    participant_id = (select auth.uid())
    and public.has_active_class_role(class_id, 'participant')
    and exists (
      select 1
      from public.attempts attempt
      where attempt.id = attempt_events.attempt_id
        and attempt.participant_id = (select auth.uid())
        and attempt.class_id = attempt_events.class_id
        and attempt.mission_version_id = attempt_events.mission_version_id
    )
  );

create policy preferences_select_own
  on public.preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy preferences_insert_own
  on public.preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy preferences_update_own
  on public.preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy help_requests_select_owner_or_monitor
  on public.help_requests for select to authenticated
  using (
    participant_id = (select auth.uid())
    or public.is_class_monitor(class_id)
  );
create policy help_requests_insert_owner
  on public.help_requests for insert to authenticated
  with check (
    participant_id = (select auth.uid())
    and participant_role = 'participant'
    and public.has_active_class_role(class_id, 'participant')
    and assigned_monitor_id is null
    and status = 'open'
    and acknowledged_at is null
    and resolved_at is null
  );
create policy help_requests_update_monitors
  on public.help_requests for update to authenticated
  using (public.is_class_monitor(class_id))
  with check (public.is_class_monitor(class_id));

revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.has_active_class_role(uuid, public.app_role) from public;
revoke all on function public.is_active_class_member(uuid) from public;
revoke all on function public.is_class_monitor(uuid) from public;
revoke all on function public.can_monitor_user(uuid) from public;
revoke all on function public.is_published_mission_version(uuid) from public;
revoke all on function public.is_assignment_available(uuid, uuid, uuid) from public;
revoke all on function public.enforce_assignment_identity() from public;
revoke all on function public.enforce_attempt_write() from public;
revoke all on function public.enforce_help_request_write() from public;

grant execute on function public.has_active_class_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_active_class_member(uuid) to authenticated;
grant execute on function public.is_class_monitor(uuid) to authenticated;
grant execute on function public.can_monitor_user(uuid) to authenticated;
grant execute on function public.is_published_mission_version(uuid) to authenticated;
grant execute on function public.is_assignment_available(uuid, uuid, uuid) to authenticated;

revoke all privileges on table
  public.profiles,
  public.classes,
  public.memberships,
  public.invitations,
  public.missions,
  public.mission_versions,
  public.mission_steps,
  public.class_mission_assignments,
  public.attempts,
  public.attempt_events,
  public.preferences,
  public.help_requests
from anon, authenticated;

grant select on table
  public.profiles,
  public.classes,
  public.memberships,
  public.invitations,
  public.missions,
  public.mission_versions,
  public.mission_steps,
  public.class_mission_assignments,
  public.attempts,
  public.attempt_events,
  public.preferences,
  public.help_requests
to authenticated;

grant update (display_name, avatar_url) on public.profiles to authenticated;
grant update (name, shift, status) on public.classes to authenticated;
grant insert on table public.invitations to authenticated;
grant insert, delete on table public.class_mission_assignments to authenticated;
grant update (status, is_required, available_from, due_at)
  on public.class_mission_assignments to authenticated;
grant insert on table public.attempts to authenticated;
grant update (current_step_id, status, metadata) on public.attempts to authenticated;
grant insert on table public.attempt_events to authenticated;
grant update (
  larger_text,
  high_contrast,
  auto_audio,
  voice_response,
  audio_rate,
  locale,
  onboarding_completed_at
) on public.preferences to authenticated;
grant insert on table public.help_requests to authenticated;
grant update (assigned_monitor_id, status, resolution_note)
  on public.help_requests to authenticated;

grant all privileges on table
  public.profiles,
  public.classes,
  public.memberships,
  public.invitations,
  public.missions,
  public.mission_versions,
  public.mission_steps,
  public.class_mission_assignments,
  public.attempts,
  public.attempt_events,
  public.preferences,
  public.help_requests
to service_role;

commit;
