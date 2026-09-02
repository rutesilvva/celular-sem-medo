begin;

-- Preserva o acesso das contas antigas antes de remover os vínculos de turma.
insert into public.administrators (user_id, status, granted_by, granted_at)
select distinct membership.user_id, 'active'::public.administrator_status, null::uuid, now()
from public.memberships membership
where membership.role = 'monitor'
on conflict (user_id) do update set status = 'active', revoked_at = null;

-- Convites para o papel removido não podem ser reaproveitados como convites de
-- aluno. Seus segredos são descartados antes da exclusão.
update public.invitations
set token_hash = null, email = null, revoked_at = coalesce(revoked_at, now()), updated_at = now()
where role = 'monitor';
delete from public.invitations where role = 'monitor';

update public.admin_audit_events set target_role = null where target_role = 'monitor';
delete from public.memberships where role = 'monitor';

drop trigger if exists memberships_reject_removed_monitor_role on public.memberships;
drop function if exists public.reject_active_monitor_membership();

-- PostgreSQL não remove valores de enum. Renomear preserva OIDs, dependências e
-- dados históricos das atribuições, que agora passam a indicar autoria admin.
alter type public.app_role rename value 'monitor' to 'admin';

alter table public.memberships
  add constraint memberships_allowed_role_only check (role in ('participant', 'admin') or session_user = 'postgres');
alter table public.invitations
  add constraint invitations_participant_role_only check (role = 'participant');

alter table public.class_mission_assignments
  rename constraint class_mission_assignments_monitor_role to class_mission_assignments_admin_role;

alter table public.help_requests rename column assigned_monitor_id to assigned_admin_id;
alter table public.help_requests rename column assigned_monitor_role to assigned_admin_role;
alter table public.help_requests
  rename constraint help_requests_monitor_role to help_requests_admin_role;
alter table public.help_requests
  rename constraint help_requests_assigned_admin_profile_fk to help_requests_assigned_admin_profile_fk_v2;

alter table public.help_requests drop constraint help_requests_resolution_code_check;
update public.help_requests
set resolution_code = 'guided_by_admin'
where resolution_code = 'guided_by_monitor';
alter table public.help_requests add constraint help_requests_resolution_code_check
  check (resolution_code is null or resolution_code in (
    'review_hint', 'try_again', 'scheduled_support', 'guided_by_admin'
  ));

alter function public.is_class_monitor(uuid) rename to is_class_admin;
alter function public.can_monitor_user(uuid) rename to can_administer_user;
alter function public.get_monitor_class_participants(uuid) rename to get_admin_class_participants;
alter function public.get_monitor_participant(uuid, uuid) rename to get_admin_participant;
alter function public.get_monitor_attempt_summaries(uuid) rename to get_admin_attempt_summaries;
alter function public.get_monitor_attempt_event_summaries(uuid, uuid) rename to get_admin_attempt_event_summaries;
alter function public.get_monitor_participant_metrics(uuid, integer) rename to get_admin_participant_metrics;
alter function public.get_monitor_participants_page(uuid, integer, text, text, text, integer, integer) rename to get_admin_participants_page;
alter function public.get_monitor_participant_report(uuid, uuid, integer) rename to get_admin_participant_report;
alter function public.get_monitor_participant_history(uuid, uuid, integer, integer) rename to get_admin_participant_history;
alter function public.get_monitor_class_evolution(uuid, integer) rename to get_admin_class_evolution;
alter function public.get_monitor_class_progress(uuid, integer) rename to get_admin_class_progress;
alter function public.get_monitor_mission_progress(uuid, integer) rename to get_admin_mission_progress;
alter function public.get_monitor_help_requests(uuid) rename to get_admin_help_requests;

alter policy profiles_select_own_or_monitored on public.profiles rename to profiles_select_own_or_admin;
alter policy memberships_select_active_self_or_monitor on public.memberships rename to memberships_select_active_self_or_admin;
alter policy classes_update_monitors on public.classes rename to classes_update_admins;
alter policy assignments_select_by_role on public.class_mission_assignments rename to assignments_select_by_access;
alter policy assignments_insert_monitors on public.class_mission_assignments rename to assignments_insert_admins;
alter policy assignments_update_monitors on public.class_mission_assignments rename to assignments_update_admins;
alter policy assignments_delete_monitors on public.class_mission_assignments rename to assignments_delete_admins;
alter policy help_requests_select_active_owner_or_monitor on public.help_requests rename to help_requests_select_active_owner_or_admin;
alter policy help_requests_update_monitors on public.help_requests rename to help_requests_update_admins;
alter policy help_history_select_scope on public.help_request_history rename to help_history_select_owner_or_admin;

create or replace function public.has_active_class_role(
  target_class_id uuid,
  required_role public.app_role default null
)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_account_active() and case
    when required_role = 'admin' then (
      public.is_global_admin() or exists (
        select 1 from public.memberships test_admin
        where test_admin.class_id = target_class_id and test_admin.user_id = auth.uid()
          and test_admin.role = 'admin' and test_admin.status = 'active'
      )
    ) and exists (select 1 from public.classes class where class.id = target_class_id and class.status = 'active')
    else exists (
      select 1 from public.memberships membership
      join public.classes class on class.id = membership.class_id
      where membership.class_id = target_class_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
        and class.status = 'active'
        and (required_role is null or membership.role = required_role)
    )
  end;
$$;

create or replace function public.is_class_admin(target_class_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_active_class_role(target_class_id, 'admin');
$$;

create or replace function public.can_administer_user(target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (public.is_global_admin() or exists (
    select 1 from public.memberships viewer
    join public.memberships target on target.class_id = viewer.class_id
    where viewer.user_id = auth.uid() and viewer.role = 'admin' and viewer.status = 'active'
      and target.user_id = target_user_id and target.role = 'participant' and target.status = 'active'
  )) and exists (select 1 from public.profiles profile where profile.id = target_user_id);
$$;

create or replace function public.can_admin_user(target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_administer_user(target_user_id);
$$;

create or replace function public.get_admin_class_participants(target_class_id uuid)
returns table (
  participant_id uuid,
  display_name text,
  avatar_url text,
  joined_at timestamptz,
  assigned_missions integer,
  completed_missions integer,
  progress_percent integer,
  average_score numeric,
  audio_usage_percent integer,
  autonomy_percent integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_active_class_role(target_class_id, 'admin') then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  with available_assignments as (
    select assignment.id
    from public.class_mission_assignments assignment
    where assignment.class_id = target_class_id
      and assignment.status = 'active'
      and assignment.available_from <= now()
      and (assignment.due_at is null or assignment.due_at > now())
  ), assignment_total as (
    select count(*)::integer as value from available_assignments
  ), participant_attempts as (
    select
      attempt.participant_id,
      count(distinct attempt.assignment_id) filter (where attempt.status = 'completed')::integer as completed,
      avg(attempt.score) filter (where attempt.status = 'completed') as average_score,
      count(*)::integer as attempt_count,
      count(*) filter (
        where exists (
          select 1 from public.attempt_events event
          where event.attempt_id = attempt.id
            and event.event_type in ('audio_started', 'audio_completed')
        )
      )::integer as audio_attempts,
      count(*) filter (
        where attempt.status = 'completed'
          and not exists (
            select 1 from public.attempt_events event
            where event.attempt_id = attempt.id
              and event.event_type in ('hint_requested', 'help_requested')
          )
      )::integer as autonomous_attempts,
      count(*) filter (where attempt.status = 'completed')::integer as completed_attempts
    from public.attempts attempt
    where attempt.class_id = target_class_id
    group by attempt.participant_id
  )
  select
    membership.user_id,
    profile.display_name,
    profile.avatar_url,
    membership.joined_at,
    assignment_total.value,
    coalesce(stats.completed, 0),
    case when assignment_total.value = 0 then 0
      else least(100, round(100.0 * coalesce(stats.completed, 0) / assignment_total.value)::integer)
    end,
    round(coalesce(stats.average_score, 0), 2),
    case when coalesce(stats.attempt_count, 0) = 0 then 0
      else round(100.0 * stats.audio_attempts / stats.attempt_count)::integer
    end,
    case when coalesce(stats.completed_attempts, 0) = 0 then 0
      else round(100.0 * stats.autonomous_attempts / stats.completed_attempts)::integer
    end
  from public.memberships membership
  join public.profiles profile on profile.id = membership.user_id
  cross join assignment_total
  left join participant_attempts stats on stats.participant_id = membership.user_id
  where membership.class_id = target_class_id
    and membership.role = 'participant'
    and membership.status = 'active'
    and profile.account_status = 'active'
  order by profile.display_name, membership.user_id;
end;
$$;

create or replace function public.get_admin_participant(target_class_id uuid, target_participant_id uuid)
returns table (
  participant_id uuid,
  display_name text,
  avatar_url text,
  joined_at timestamptz,
  assigned_missions integer,
  completed_missions integer,
  progress_percent integer,
  average_score numeric,
  audio_usage_percent integer,
  autonomy_percent integer
)
language sql stable security definer set search_path = '' as $$
  select participant.*
  from public.get_admin_class_participants(target_class_id) participant
  where participant.participant_id = target_participant_id;
$$;

create or replace function public.get_admin_attempt_summaries(target_class_id uuid)
returns table (
  attempt_id uuid,
  participant_id uuid,
  mission_version_id uuid,
  assignment_id uuid,
  current_step_id uuid,
  status public.attempt_status,
  score numeric,
  started_at timestamptz,
  last_activity_at timestamptz,
  completed_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_active_class_role(target_class_id, 'admin') and not public.is_global_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  select
    attempt.id,
    attempt.participant_id,
    attempt.mission_version_id,
    attempt.assignment_id,
    attempt.current_step_id,
    attempt.status,
    attempt.score,
    attempt.started_at,
    attempt.last_activity_at,
    attempt.completed_at
  from public.attempts attempt
  where attempt.class_id = target_class_id;
end;
$$;

create or replace function public.get_admin_attempt_event_summaries(
  target_class_id uuid,
  target_attempt_id uuid
)
returns table (
  event_id uuid,
  attempt_id uuid,
  participant_id uuid,
  step_id uuid,
  sequence_number integer,
  event_type public.attempt_event_type,
  occurred_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_active_class_role(target_class_id, 'admin') and not public.is_global_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  select
    event.id,
    event.attempt_id,
    event.participant_id,
    event.step_id,
    event.sequence_number,
    event.event_type,
    event.occurred_at
  from public.attempt_events event
  where event.class_id = target_class_id
    and event.attempt_id = target_attempt_id;
end;
$$;

create or replace function public.get_admin_participant_metrics(
  target_class_id uuid,
  period_days integer default 30
)
returns table (
  participant_id uuid, display_name text, avatar_url text, joined_at timestamptz,
  assigned_missions integer, completed_missions integer, progress_percent integer,
  average_score numeric, audio_usage_percent integer, autonomy_percent integer,
  difficulty_percent integer, attempt_count integer, completed_attempt_count integer,
  helped_attempt_count integer, last_activity_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if period_days not in (7, 30, 90) then raise exception 'INVALID_PERIOD' using errcode = '22023'; end if;
  if not public.has_active_class_role(target_class_id, 'admin') then raise exception 'admin access required' using errcode = '42501'; end if;
  return query
  with assignments as (
    select assignment.id from public.class_mission_assignments assignment
    join public.mission_versions version on version.id = assignment.mission_version_id and version.status = 'published'
    where assignment.class_id = target_class_id and assignment.status = 'active'
      and assignment.available_from <= now() and (assignment.due_at is null or assignment.due_at > now())
  ), assignment_total as (select count(*)::integer value from assignments),
  scoped_attempts as (
    select attempt.* from public.attempts attempt
    where attempt.class_id = target_class_id
      and attempt.started_at >= now() - make_interval(days => period_days)
  ), stats as (
    select attempt.participant_id,
      count(*)::integer attempt_count,
      count(*) filter (where attempt.status = 'completed')::integer completed_attempt_count,
      count(distinct attempt.assignment_id) filter (where attempt.status = 'completed')::integer completed_missions,
      round(coalesce(avg(attempt.score) filter (where attempt.status = 'completed'), 0), 2) average_score,
      count(*) filter (where exists (select 1 from public.attempt_events event where event.attempt_id = attempt.id and event.event_type in ('audio_started','audio_completed')))::integer audio_attempts,
      count(*) filter (where attempt.status = 'completed' and not exists (select 1 from public.attempt_events event where event.attempt_id = attempt.id and event.event_type in ('hint_requested','help_requested')))::integer autonomous_attempts,
      count(*) filter (where exists (select 1 from public.attempt_events event where event.attempt_id = attempt.id and event.event_type in ('action_failed','hint_requested','help_requested')))::integer difficult_attempts,
      count(*) filter (where exists (select 1 from public.attempt_events event where event.attempt_id = attempt.id and event.event_type in ('hint_requested','help_requested')))::integer helped_attempts,
      max(attempt.last_activity_at) last_activity_at
    from scoped_attempts attempt group by attempt.participant_id
  )
  select membership.user_id, profile.display_name, profile.avatar_url, membership.joined_at,
    assignment_total.value, coalesce(stats.completed_missions, 0),
    case when assignment_total.value = 0 then 0 else least(100, round(100.0 * coalesce(stats.completed_missions, 0) / assignment_total.value)::integer) end,
    coalesce(stats.average_score, 0),
    case when coalesce(stats.attempt_count, 0) = 0 then 0 else round(100.0 * stats.audio_attempts / stats.attempt_count)::integer end,
    case when coalesce(stats.completed_attempt_count, 0) = 0 then 0 else round(100.0 * stats.autonomous_attempts / stats.completed_attempt_count)::integer end,
    case when coalesce(stats.attempt_count, 0) = 0 then 0 else round(100.0 * stats.difficult_attempts / stats.attempt_count)::integer end,
    coalesce(stats.attempt_count, 0), coalesce(stats.completed_attempt_count, 0),
    coalesce(stats.helped_attempts, 0), stats.last_activity_at
  from public.memberships membership
  join public.profiles profile on profile.id = membership.user_id
  cross join assignment_total left join stats on stats.participant_id = membership.user_id
  where membership.class_id = target_class_id and membership.role = 'participant'
    and membership.status = 'active' and profile.account_status = 'active';
end;
$$;

create or replace function public.get_admin_participants_page(
  target_class_id uuid, period_days integer default 30, search_text text default '',
  progress_filter text default 'all', sort_by text default 'name',
  page_size integer default 20, page_offset integer default 0
)
returns table (
  participant_id uuid, display_name text, avatar_url text, joined_at timestamptz,
  assigned_missions integer, completed_missions integer, progress_percent integer,
  average_score numeric, audio_usage_percent integer, autonomy_percent integer,
  difficulty_percent integer, attempt_count integer, completed_attempt_count integer,
  helped_attempt_count integer, last_activity_at timestamptz, total_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if page_size not between 1 and 100 or page_offset < 0 then raise exception 'INVALID_PAGE' using errcode = '22023'; end if;
  if progress_filter not in ('all','attention','advancing') then raise exception 'INVALID_FILTER' using errcode = '22023'; end if;
  if sort_by not in ('name','progress_asc','progress_desc','recent') then raise exception 'INVALID_SORT' using errcode = '22023'; end if;
  return query
  select metrics.*, count(*) over() total_count
  from public.get_admin_participant_metrics(target_class_id, period_days) metrics
  where (btrim(search_text) = '' or position(lower(btrim(search_text)) in lower(metrics.display_name)) > 0)
    and (progress_filter = 'all' or (progress_filter = 'attention' and metrics.progress_percent < 55) or (progress_filter = 'advancing' and metrics.progress_percent >= 55))
  order by
    case when sort_by = 'name' then lower(metrics.display_name) end,
    case when sort_by = 'progress_asc' then metrics.progress_percent end,
    case when sort_by = 'progress_desc' then metrics.progress_percent end desc,
    case when sort_by = 'recent' then metrics.last_activity_at end desc nulls last,
    metrics.participant_id
  limit page_size offset page_offset;
end;
$$;

create or replace function public.get_admin_participant_report(
  target_class_id uuid, target_participant_id uuid, period_days integer default 30
)
returns table (
  participant_id uuid, display_name text, avatar_url text, joined_at timestamptz,
  assigned_missions integer, completed_missions integer, progress_percent integer,
  average_score numeric, audio_usage_percent integer, autonomy_percent integer,
  difficulty_percent integer, attempt_count integer, completed_attempt_count integer,
  helped_attempt_count integer, last_activity_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select metrics.* from public.get_admin_participant_metrics(target_class_id, period_days) metrics
  where metrics.participant_id = target_participant_id;
$$;

create or replace function public.get_admin_participant_history(
  target_class_id uuid, target_participant_id uuid, period_days integer default 30,
  result_limit integer default 20
)
returns table (
  attempt_id uuid, assignment_id uuid, mission_title text, attempt_status public.attempt_status,
  started_at timestamptz, completed_at timestamptz, last_activity_at timestamptz,
  used_audio boolean, used_hint boolean, requested_help boolean, error_count integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if period_days not in (7, 30, 90) or result_limit not between 1 and 100 then raise exception 'INVALID_HISTORY_QUERY' using errcode = '22023'; end if;
  if not public.has_active_class_role(target_class_id, 'admin') then raise exception 'admin access required' using errcode = '42501'; end if;
  if not exists (select 1 from public.memberships membership where membership.class_id = target_class_id and membership.user_id = target_participant_id and membership.role = 'participant' and membership.status = 'active') then return; end if;
  return query
  select attempt.id, attempt.assignment_id, version.title, attempt.status,
    attempt.started_at, attempt.completed_at, attempt.last_activity_at,
    exists (select 1 from public.attempt_events event where event.attempt_id = attempt.id and event.event_type in ('audio_started','audio_completed')),
    exists (select 1 from public.attempt_events event where event.attempt_id = attempt.id and event.event_type = 'hint_requested'),
    exists (select 1 from public.attempt_events event where event.attempt_id = attempt.id and event.event_type = 'help_requested'),
    (select count(*)::integer from public.attempt_events event where event.attempt_id = attempt.id and event.event_type = 'action_failed')
  from public.attempts attempt join public.mission_versions version on version.id = attempt.mission_version_id
  where attempt.class_id = target_class_id and attempt.participant_id = target_participant_id
    and attempt.started_at >= now() - make_interval(days => period_days)
  order by attempt.last_activity_at desc, attempt.id limit result_limit;
end;
$$;

create or replace function public.get_admin_class_evolution(target_class_id uuid, period_days integer default 30)
returns table (activity_date date, active_participants integer, completed_attempts integer, attempt_count integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if period_days not in (7, 30, 90) then raise exception 'INVALID_PERIOD' using errcode = '22023'; end if;
  if not public.has_active_class_role(target_class_id, 'admin') then raise exception 'admin access required' using errcode = '42501'; end if;
  return query
  with days as (
    select generate_series((now() at time zone 'UTC')::date - (period_days - 1), (now() at time zone 'UTC')::date, interval '1 day')::date activity_date
  )
  select days.activity_date,
    count(distinct attempt.participant_id)::integer,
    count(*) filter (where attempt.status = 'completed')::integer,
    count(attempt.id)::integer
  from days left join public.attempts attempt on attempt.class_id = target_class_id
    and (attempt.started_at at time zone 'UTC')::date = days.activity_date
  group by days.activity_date order by days.activity_date;
end;
$$;

create or replace function public.get_admin_class_progress(target_class_id uuid, period_days integer default 30)
returns table (
  participant_count integer, assigned_missions integer, completed_missions integer,
  completion_percent integer, autonomy_percent integer, audio_usage_percent integer,
  difficulty_percent integer, active_participants integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if period_days not between 1 and 365 then raise exception 'INVALID_PERIOD' using errcode = '22023'; end if;
  if not public.has_active_class_role(target_class_id, 'admin') then raise exception 'admin access required' using errcode = '42501'; end if;
  return query
  with people as (
    select membership.user_id from public.memberships membership join public.profiles profile on profile.id = membership.user_id
    where membership.class_id = target_class_id and membership.role = 'participant' and membership.status = 'active' and profile.account_status = 'active'
  ), assignments as (
    select assignment.id from public.class_mission_assignments assignment
    join public.mission_versions version on version.id = assignment.mission_version_id and version.status = 'published'
    where assignment.class_id = target_class_id and assignment.status = 'active' and assignment.available_from <= now() and (assignment.due_at is null or assignment.due_at > now())
  ), attempts_in_period as (
    select attempt.* from public.attempts attempt where attempt.class_id = target_class_id and attempt.started_at >= now() - make_interval(days => period_days)
  ), totals as (
    select count(*)::integer attempt_count,
      count(*) filter (where status = 'completed')::integer completed_attempts,
      count(*) filter (where status = 'completed' and not exists (select 1 from public.attempt_events event where event.attempt_id = attempts_in_period.id and event.event_type in ('hint_requested','help_requested')))::integer autonomous_attempts,
      count(*) filter (where exists (select 1 from public.attempt_events event where event.attempt_id = attempts_in_period.id and event.event_type in ('audio_started','audio_completed')))::integer audio_attempts,
      count(*) filter (where exists (select 1 from public.attempt_events event where event.attempt_id = attempts_in_period.id and event.event_type in ('action_failed','hint_requested','help_requested')))::integer difficult_attempts
    from attempts_in_period
  )
  select (select count(*)::integer from people), (select count(*)::integer from assignments),
    (select count(distinct (attempt.participant_id, attempt.assignment_id))::integer from attempts_in_period attempt where attempt.status = 'completed'),
    case when (select count(*) from people) * (select count(*) from assignments) = 0 then 0 else least(100, round(100.0 * (select count(distinct (attempt.participant_id, attempt.assignment_id)) from attempts_in_period attempt where attempt.status = 'completed') / ((select count(*) from people) * (select count(*) from assignments)))::integer) end,
    case when totals.completed_attempts = 0 then 0 else round(100.0 * totals.autonomous_attempts / totals.completed_attempts)::integer end,
    case when totals.attempt_count = 0 then 0 else round(100.0 * totals.audio_attempts / totals.attempt_count)::integer end,
    case when totals.attempt_count = 0 then 0 else round(100.0 * totals.difficult_attempts / totals.attempt_count)::integer end,
    (select count(distinct participant_id)::integer from attempts_in_period)
  from totals;
end;
$$;

create or replace function public.get_admin_mission_progress(target_class_id uuid, period_days integer default 30)
returns table (assignment_id uuid, title text, participant_count integer, completed_participants integer, completion_percent integer, autonomy_percent integer, difficulty_percent integer, audio_usage_percent integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if period_days not between 1 and 365 then raise exception 'INVALID_PERIOD' using errcode = '22023'; end if;
  if not public.has_active_class_role(target_class_id, 'admin') then raise exception 'admin access required' using errcode = '42501'; end if;
  return query
  with people as (select count(*)::integer value from public.memberships where class_id = target_class_id and role = 'participant' and status = 'active'),
  scoped as (
    select assignment.id, version.title from public.class_mission_assignments assignment join public.mission_versions version on version.id = assignment.mission_version_id
    where assignment.class_id = target_class_id and assignment.status = 'active' and version.status = 'published'
  )
  select scoped.id, scoped.title, people.value,
    count(distinct attempt.participant_id) filter (where attempt.status = 'completed')::integer,
    case when people.value = 0 then 0 else round(100.0 * count(distinct attempt.participant_id) filter (where attempt.status = 'completed') / people.value)::integer end,
    case when count(*) filter (where attempt.status = 'completed') = 0 then 0 else round(100.0 * count(*) filter (where attempt.status = 'completed' and not exists (select 1 from public.attempt_events event where event.attempt_id = attempt.id and event.event_type in ('hint_requested','help_requested'))) / count(*) filter (where attempt.status = 'completed'))::integer end,
    case when count(attempt.id) = 0 then 0 else round(100.0 * count(*) filter (where exists (select 1 from public.attempt_events event where event.attempt_id = attempt.id and event.event_type in ('action_failed','hint_requested','help_requested'))) / count(attempt.id))::integer end,
    case when count(attempt.id) = 0 then 0 else round(100.0 * count(*) filter (where exists (select 1 from public.attempt_events event where event.attempt_id = attempt.id and event.event_type in ('audio_started','audio_completed'))) / count(attempt.id))::integer end
  from scoped cross join people left join public.attempts attempt on attempt.assignment_id = scoped.id and attempt.started_at >= now() - make_interval(days => period_days)
  group by scoped.id, scoped.title, people.value order by scoped.title;
end;
$$;

create or replace function public.get_admin_help_requests(target_class_id uuid)
returns table (
  help_request_id uuid, participant_id uuid, participant_name text,
  status public.help_request_status, reason_code text, resolution_code text,
  mission_title text, step_title text, requested_at timestamptz,
  acknowledged_at timestamptz, resolved_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_class_admin(target_class_id) then
    raise exception 'CLASS_ACCESS_DENIED' using errcode = '42501';
  end if;
  return query
  select request.id, request.participant_id, profile.display_name, request.status,
    request.reason_code, request.resolution_code, version.title, step.title,
    request.requested_at, request.acknowledged_at, request.resolved_at
  from public.help_requests request
  join public.profiles profile on profile.id = request.participant_id
  join public.mission_versions version on version.id = request.mission_version_id
  left join public.mission_steps step on step.id = request.step_id
  where request.class_id = target_class_id
  order by case request.status when 'open' then 0 when 'in_progress' then 1 else 2 end,
    request.requested_at;
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
      new.assigned_admin_id := null;
      new.assigned_admin_role := 'admin';
      new.status := 'open';
      new.acknowledged_at := null;
      new.resolved_at := null;
      new.resolution_code := null;
      new.requested_at := now();
    end if;
    return new;
  end if;

  if row(new.id, new.class_id, new.participant_id, new.participant_role, new.attempt_id, new.mission_version_id, new.step_id, new.reason_code, new.requested_at)
    is distinct from row(old.id, old.class_id, old.participant_id, old.participant_role, old.attempt_id, old.mission_version_id, old.step_id, old.reason_code, old.requested_at) then
    raise exception 'help request identity and original reason are immutable';
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

create or replace function public.prevent_non_participant_membership()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role not in ('participant', 'admin') and session_user <> 'postgres' then
    raise exception 'CLASS_MEMBERSHIP_ROLE_INVALID' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger memberships_require_participant_role
before insert or update on public.memberships
for each row execute function public.prevent_non_participant_membership();

create or replace function public.get_my_class_contexts()
returns table (
  membership_id uuid, class_id uuid, class_name text, class_shift text,
  access_role public.app_role, joined_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select membership.id, class.id, class.name, class.shift, membership.role, membership.joined_at
  from public.memberships membership
  join public.classes class on class.id = membership.class_id
  where public.is_account_active()
    and membership.user_id = auth.uid()
    and membership.role = 'participant'
    and membership.status = 'active'
    and class.status = 'active'
  order by membership.joined_at, class.name;
$$;

create or replace function public.create_class_invitation(
  target_class_id uuid, invited_email text, invited_role public.app_role default 'participant'
)
returns table (invitation_id uuid, invitation_token text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(btrim(invited_email));
  plain_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if not public.is_account_active() or not public.is_global_admin() then
    raise exception 'ADMIN_ACCESS_REQUIRED' using errcode = '42501';
  end if;
  if invited_role <> 'participant' then
    raise exception 'INVITATION_ROLE_INVALID' using errcode = '22023';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(normalized_email) > 320 then
    raise exception 'invalid invitation email' using errcode = '22023';
  end if;

  return query insert into public.invitations(class_id,email,role,token_hash,invited_by,expires_at)
  values(target_class_id,normalized_email,'participant',encode(extensions.digest(plain_token,'sha256'),'hex'),auth.uid(),now()+interval '7 days')
  returning invitations.id, plain_token, invitations.expires_at;
end;
$$;

create or replace function public.list_class_invitations(target_class_id uuid)
returns table (
  invitation_id uuid, email text, role public.app_role, status text,
  expires_at timestamptz, created_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_global_admin() then
    raise exception 'ADMIN_ACCESS_REQUIRED' using errcode = '42501';
  end if;
  return query
  select invitation.id,coalesce(invitation.email,''),invitation.role,
    case when invitation.accepted_at is not null then 'accepted'
      when invitation.revoked_at is not null then 'revoked'
      when invitation.expires_at <= now() then 'expired' else 'pending' end,
    invitation.expires_at,invitation.created_at
  from public.invitations invitation
  where invitation.class_id=target_class_id
  order by invitation.created_at desc;
end;
$$;

create or replace function public.queue_help_push() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.push_outbox(recipient_id, help_request_id, event_type, body, route)
    select administrator.user_id, new.id, 'help_requested',
      'Há um novo pedido de ajuda no aplicativo.', '/admin/help-requests?id=' || new.id::text
    from public.administrators administrator
    join public.profiles profile on profile.id = administrator.user_id
    where administrator.status = 'active' and profile.account_status = 'active';
    if session_user = 'postgres' then
      insert into public.push_outbox(recipient_id, help_request_id, event_type, body, route)
      select membership.user_id,new.id,'help_requested','Há um novo pedido de ajuda no aplicativo.',
        '/admin/help-requests?id='||new.id::text
      from public.memberships membership
      where membership.class_id=new.class_id and membership.role='admin' and membership.status='active'
        and not exists (select 1 from public.administrators administrator
          where administrator.user_id=membership.user_id and administrator.status='active');
    end if;
  elsif new.status is distinct from old.status or new.resolution_code is distinct from old.resolution_code then
    insert into public.push_outbox(recipient_id, help_request_id, event_type, body, route)
    values(new.participant_id,new.id,'help_updated','Seu pedido de ajuda foi atualizado.','/participant/help-requests?id='||new.id::text);
  end if;
  return new;
end;
$$;

create or replace function public.update_help_request(
  target_help_request_id uuid,
  target_status public.help_request_status,
  target_resolution_code text default null
)
returns public.help_request_status language plpgsql security definer set search_path = '' as $$
declare request public.help_requests%rowtype;
begin
  select * into request from public.help_requests where id=target_help_request_id for update;
  if not found or not public.is_class_admin(request.class_id) then
    raise exception 'HELP_REQUEST_NOT_FOUND' using errcode='42501';
  end if;
  if target_status not in ('in_progress','resolved') then
    raise exception 'INVALID_HELP_STATUS' using errcode='22023';
  end if;
  if target_status='resolved' and target_resolution_code not in ('review_hint','try_again','scheduled_support','guided_by_admin') then
    raise exception 'RESOLUTION_REQUIRED' using errcode='22023';
  end if;
  update public.help_requests
  set status=target_status, assigned_admin_id=auth.uid(),
      resolution_code=case when target_status='resolved' then target_resolution_code else null end
  where id=request.id returning status into request.status;
  return request.status;
end;
$$;

create or replace function public.has_active_class_role(
  target_class_id uuid,
  required_role text default null
)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_account_active() and case
    when lower(coalesce(required_role, '')) in ('admin', 'monitor') then (
      public.is_global_admin() or exists (
        select 1 from public.memberships test_admin
        where test_admin.class_id = target_class_id and test_admin.user_id = auth.uid()
          and test_admin.role = 'admin' and test_admin.status = 'active'
      )
    ) and exists (select 1 from public.classes class where class.id = target_class_id and class.status = 'active')
    else exists (
      select 1 from public.memberships membership
      join public.classes class on class.id = membership.class_id
      where membership.class_id = target_class_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
        and class.status = 'active'
        and (required_role is null or lower(membership.role::text) = lower(required_role))
    )
  end;
$$;

create or replace function public.is_class_monitor(target_class_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_class_admin(target_class_id);
$$;

create or replace function public.can_monitor_user(target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_administer_user(target_user_id);
$$;

create or replace function public.get_monitor_participant_metrics(
  target_class_id uuid,
  period_days integer default 30
)
returns table (
  participant_id uuid, display_name text, avatar_url text, joined_at timestamptz,
  assigned_missions integer, completed_missions integer, progress_percent integer,
  average_score numeric, audio_usage_percent integer, autonomy_percent integer,
  difficulty_percent integer, attempt_count integer, completed_attempt_count integer,
  helped_attempt_count integer, last_activity_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select * from public.get_admin_participant_metrics(target_class_id, period_days);
$$;

create or replace function public.get_monitor_participants_page(
  target_class_id uuid, period_days integer default 30, search_text text default '',
  progress_filter text default 'all', sort_by text default 'name',
  page_size integer default 20, page_offset integer default 0
)
returns table (
  participant_id uuid, display_name text, avatar_url text, joined_at timestamptz,
  assigned_missions integer, completed_missions integer, progress_percent integer,
  average_score numeric, audio_usage_percent integer, autonomy_percent integer,
  difficulty_percent integer, attempt_count integer, completed_attempt_count integer,
  helped_attempt_count integer, last_activity_at timestamptz, total_count bigint
)
language sql stable security definer set search_path = '' as $$
  select * from public.get_admin_participants_page(
    target_class_id, period_days, search_text, progress_filter, sort_by, page_size, page_offset
  );
$$;

create or replace function public.get_monitor_participant_report(
  target_class_id uuid, target_participant_id uuid, period_days integer default 30
)
returns table (
  participant_id uuid, display_name text, avatar_url text, joined_at timestamptz,
  assigned_missions integer, completed_missions integer, progress_percent integer,
  average_score numeric, audio_usage_percent integer, autonomy_percent integer,
  difficulty_percent integer, attempt_count integer, completed_attempt_count integer,
  helped_attempt_count integer, last_activity_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select * from public.get_admin_participant_report(target_class_id, target_participant_id, period_days);
$$;

create or replace function public.get_monitor_participant_history(
  target_class_id uuid, target_participant_id uuid, period_days integer default 30,
  result_limit integer default 20
)
returns table (
  attempt_id uuid, assignment_id uuid, mission_title text, attempt_status public.attempt_status,
  started_at timestamptz, completed_at timestamptz, last_activity_at timestamptz,
  used_audio boolean, used_hint boolean, requested_help boolean, error_count integer
)
language sql stable security definer set search_path = '' as $$
  select * from public.get_admin_participant_history(target_class_id, target_participant_id, period_days, result_limit);
$$;

create or replace function public.get_monitor_class_evolution(target_class_id uuid, period_days integer default 30)
returns table (activity_date date, active_participants integer, completed_attempts integer, attempt_count integer)
language sql stable security definer set search_path = '' as $$
  select * from public.get_admin_class_evolution(target_class_id, period_days);
$$;

create or replace function public.get_monitor_class_progress(target_class_id uuid, period_days integer default 30)
returns table (
  participant_count integer, assigned_missions integer, completed_missions integer,
  completion_percent integer, autonomy_percent integer, audio_usage_percent integer,
  difficulty_percent integer, active_participants integer
)
language sql stable security definer set search_path = '' as $$
  select * from public.get_admin_class_progress(target_class_id, period_days);
$$;

create or replace function public.get_monitor_mission_progress(target_class_id uuid, period_days integer default 30)
returns table (
  assignment_id uuid, title text, participant_count integer, completed_participants integer,
  completion_percent integer, autonomy_percent integer, difficulty_percent integer, audio_usage_percent integer
)
language sql stable security definer set search_path = '' as $$
  select * from public.get_admin_mission_progress(target_class_id, period_days);
$$;

create or replace function public.get_monitor_help_requests(target_class_id uuid)
returns table (
  help_request_id uuid, participant_id uuid, participant_name text,
  status public.help_request_status, reason_code text, resolution_code text,
  mission_title text, step_title text, requested_at timestamptz,
  acknowledged_at timestamptz, resolved_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select * from public.get_admin_help_requests(target_class_id);
$$;

revoke all on function public.prevent_non_participant_membership() from public;
revoke all on function public.is_class_monitor(uuid), public.can_monitor_user(uuid), public.get_monitor_participant_metrics(uuid, integer), public.get_monitor_participants_page(uuid, integer, text, text, text, integer, integer), public.get_monitor_participant_report(uuid, uuid, integer), public.get_monitor_participant_history(uuid, uuid, integer, integer), public.get_monitor_class_evolution(uuid, integer), public.get_monitor_class_progress(uuid, integer), public.get_monitor_mission_progress(uuid, integer), public.get_monitor_help_requests(uuid) from public;

-- Os wrappers acima existiram apenas durante a transição local dos testes.
-- A migração final não mantém aliases nem overloads do papel removido.
drop function public.get_monitor_help_requests(uuid);
drop function public.get_monitor_mission_progress(uuid, integer);
drop function public.get_monitor_class_progress(uuid, integer);
drop function public.get_monitor_class_evolution(uuid, integer);
drop function public.get_monitor_participant_history(uuid, uuid, integer, integer);
drop function public.get_monitor_participant_report(uuid, uuid, integer);
drop function public.get_monitor_participants_page(uuid, integer, text, text, text, integer, integer);
drop function public.get_monitor_participant_metrics(uuid, integer);
drop function public.can_monitor_user(uuid);
drop function public.is_class_monitor(uuid);
drop function public.has_active_class_role(uuid, text);

commit;
