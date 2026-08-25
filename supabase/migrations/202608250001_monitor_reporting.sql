begin;

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
language plpgsql stable security definer set search_path = '' as $$
begin
  if period_days not in (7, 30, 90) then raise exception 'INVALID_PERIOD' using errcode = '22023'; end if;
  if not public.has_active_class_role(target_class_id, 'monitor') then raise exception 'monitor access required' using errcode = '42501'; end if;
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
language plpgsql stable security definer set search_path = '' as $$
begin
  if page_size not between 1 and 100 or page_offset < 0 then raise exception 'INVALID_PAGE' using errcode = '22023'; end if;
  if progress_filter not in ('all','attention','advancing') then raise exception 'INVALID_FILTER' using errcode = '22023'; end if;
  if sort_by not in ('name','progress_asc','progress_desc','recent') then raise exception 'INVALID_SORT' using errcode = '22023'; end if;
  return query
  select metrics.*, count(*) over() total_count
  from public.get_monitor_participant_metrics(target_class_id, period_days) metrics
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
  select metrics.* from public.get_monitor_participant_metrics(target_class_id, period_days) metrics
  where metrics.participant_id = target_participant_id;
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
language plpgsql stable security definer set search_path = '' as $$
begin
  if period_days not in (7, 30, 90) or result_limit not between 1 and 100 then raise exception 'INVALID_HISTORY_QUERY' using errcode = '22023'; end if;
  if not public.has_active_class_role(target_class_id, 'monitor') then raise exception 'monitor access required' using errcode = '42501'; end if;
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

create or replace function public.get_monitor_class_evolution(target_class_id uuid, period_days integer default 30)
returns table (activity_date date, active_participants integer, completed_attempts integer, attempt_count integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if period_days not in (7, 30, 90) then raise exception 'INVALID_PERIOD' using errcode = '22023'; end if;
  if not public.has_active_class_role(target_class_id, 'monitor') then raise exception 'monitor access required' using errcode = '42501'; end if;
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

revoke all on function public.get_monitor_participant_metrics(uuid, integer) from public;
revoke all on function public.get_monitor_participants_page(uuid, integer, text, text, text, integer, integer) from public;
revoke all on function public.get_monitor_participant_report(uuid, uuid, integer) from public;
revoke all on function public.get_monitor_participant_history(uuid, uuid, integer, integer) from public;
revoke all on function public.get_monitor_class_evolution(uuid, integer) from public;
grant execute on function public.get_monitor_participant_metrics(uuid, integer) to authenticated;
grant execute on function public.get_monitor_participants_page(uuid, integer, text, text, text, integer, integer) to authenticated;
grant execute on function public.get_monitor_participant_report(uuid, uuid, integer) to authenticated;
grant execute on function public.get_monitor_participant_history(uuid, uuid, integer, integer) to authenticated;
grant execute on function public.get_monitor_class_evolution(uuid, integer) to authenticated;

commit;
