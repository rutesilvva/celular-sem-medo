begin;

create or replace function public.get_participant_progress()
returns table (
  class_id uuid, assigned_missions integer, completed_missions integer,
  progress_percent integer, attempt_count integer, completed_attempt_count integer,
  autonomy_percent integer, audio_usage_percent integer, difficulty_percent integer,
  practice_streak_days integer, latest_assignment_id uuid, latest_mission_title text,
  latest_completed_at timestamptz, latest_completion_kind text
)
language sql
stable
security definer
set search_path = ''
as $$
  with participant_classes as (
    select membership.class_id
    from public.memberships membership
    join public.classes class on class.id = membership.class_id and class.status = 'active'
    join public.profiles profile on profile.id = membership.user_id and profile.account_status = 'active'
    where membership.user_id = auth.uid() and membership.role = 'participant' and membership.status = 'active'
  ), available as (
    select assignment.class_id, assignment.id
    from public.class_mission_assignments assignment
    join participant_classes scope on scope.class_id = assignment.class_id
    join public.mission_versions version on version.id = assignment.mission_version_id and version.status = 'published'
    join public.missions mission on mission.id = version.mission_id and mission.status = 'active'
    where assignment.status = 'active' and assignment.available_from <= now()
      and (assignment.due_at is null or assignment.due_at > now())
  ), attempt_stats as (
    select attempt.class_id,
      count(*)::integer attempt_count,
      count(*) filter (where attempt.status = 'completed')::integer completed_attempt_count,
      count(distinct attempt.assignment_id) filter (where attempt.status = 'completed')::integer completed_missions,
      count(*) filter (where attempt.status = 'completed' and not exists (
        select 1 from public.attempt_events event where event.attempt_id = attempt.id
          and event.event_type in ('hint_requested', 'help_requested')
      ))::integer autonomous_attempts,
      count(*) filter (where exists (
        select 1 from public.attempt_events event where event.attempt_id = attempt.id
          and event.event_type in ('audio_started', 'audio_completed')
      ))::integer audio_attempts,
      count(*) filter (where exists (
        select 1 from public.attempt_events event where event.attempt_id = attempt.id
          and event.event_type in ('action_failed', 'hint_requested', 'help_requested')
      ))::integer difficult_attempts
    from public.attempts attempt
    join participant_classes scope on scope.class_id = attempt.class_id
    where attempt.participant_id = auth.uid()
    group by attempt.class_id
  ), latest as (
    select distinct on (attempt.class_id) attempt.class_id, attempt.assignment_id,
      version.title, attempt.completed_at,
      case
        when exists (select 1 from public.attempt_events event where event.attempt_id = attempt.id and event.event_type = 'help_requested') then 'with_help'
        when exists (select 1 from public.attempt_events event where event.attempt_id = attempt.id and event.event_type = 'hint_requested') then 'with_hint'
        else 'autonomous'
      end completion_kind
    from public.attempts attempt
    join public.mission_versions version on version.id = attempt.mission_version_id
    where attempt.participant_id = auth.uid() and attempt.status = 'completed'
    order by attempt.class_id, attempt.completed_at desc, attempt.id
  ), completion_days as (
    select attempt.class_id, (attempt.completed_at at time zone 'UTC')::date practice_day
    from public.attempts attempt
    where attempt.participant_id = auth.uid() and attempt.status = 'completed'
    group by attempt.class_id, practice_day
  ), numbered_days as (
    select class_id, practice_day, max(practice_day) over (partition by class_id) latest_day,
      row_number() over (partition by class_id order by practice_day desc)::integer ordinal
    from completion_days
  ), streaks as (
    select class_id,
      case when max(latest_day) < (now() at time zone 'UTC')::date - 1 then 0
      else coalesce(min(ordinal) filter (where practice_day <> latest_day - (ordinal - 1)) - 1, count(*)::integer) end streak
    from numbered_days group by class_id
  )
  select scope.class_id, count(available.id)::integer,
    coalesce(stats.completed_missions, 0),
    case when count(available.id) = 0 then 0 else least(100, round(100.0 * coalesce(stats.completed_missions, 0) / count(available.id))::integer) end,
    coalesce(stats.attempt_count, 0), coalesce(stats.completed_attempt_count, 0),
    case when coalesce(stats.completed_attempt_count, 0) = 0 then 0 else round(100.0 * stats.autonomous_attempts / stats.completed_attempt_count)::integer end,
    case when coalesce(stats.attempt_count, 0) = 0 then 0 else round(100.0 * stats.audio_attempts / stats.attempt_count)::integer end,
    case when coalesce(stats.attempt_count, 0) = 0 then 0 else round(100.0 * stats.difficult_attempts / stats.attempt_count)::integer end,
    coalesce(streaks.streak, 0), latest.assignment_id, latest.title, latest.completed_at, latest.completion_kind
  from participant_classes scope
  left join available on available.class_id = scope.class_id
  left join attempt_stats stats on stats.class_id = scope.class_id
  left join latest on latest.class_id = scope.class_id
  left join streaks on streaks.class_id = scope.class_id
  group by scope.class_id, stats.completed_missions, stats.attempt_count, stats.completed_attempt_count,
    stats.autonomous_attempts, stats.audio_attempts, stats.difficult_attempts, streaks.streak,
    latest.assignment_id, latest.title, latest.completed_at, latest.completion_kind;
$$;

create or replace function public.get_participant_category_progress()
returns table (class_id uuid, category text, assigned_missions integer, completed_missions integer, progress_percent integer)
language sql stable security definer set search_path = '' as $$
  select assignment.class_id, mission.category, count(distinct assignment.id)::integer,
    count(distinct assignment.id) filter (where exists (
      select 1 from public.attempts attempt where attempt.assignment_id = assignment.id
        and attempt.participant_id = auth.uid() and attempt.status = 'completed'
    ))::integer,
    round(100.0 * count(distinct assignment.id) filter (where exists (
      select 1 from public.attempts attempt where attempt.assignment_id = assignment.id
        and attempt.participant_id = auth.uid() and attempt.status = 'completed'
    )) / nullif(count(distinct assignment.id), 0))::integer
  from public.class_mission_assignments assignment
  join public.mission_versions version on version.id = assignment.mission_version_id and version.status = 'published'
  join public.missions mission on mission.id = version.mission_id and mission.status = 'active'
  where public.has_active_class_role(assignment.class_id, 'participant')
    and assignment.status = 'active' and assignment.available_from <= now()
    and (assignment.due_at is null or assignment.due_at > now())
  group by assignment.class_id, mission.category order by mission.category;
$$;

create or replace function public.get_monitor_class_progress(target_class_id uuid, period_days integer default 30)
returns table (
  participant_count integer, assigned_missions integer, completed_missions integer,
  completion_percent integer, autonomy_percent integer, audio_usage_percent integer,
  difficulty_percent integer, active_participants integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if period_days not between 1 and 365 then raise exception 'INVALID_PERIOD' using errcode = '22023'; end if;
  if not public.has_active_class_role(target_class_id, 'monitor') then raise exception 'monitor access required' using errcode = '42501'; end if;
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

create or replace function public.get_monitor_mission_progress(target_class_id uuid, period_days integer default 30)
returns table (assignment_id uuid, title text, participant_count integer, completed_participants integer, completion_percent integer, autonomy_percent integer, difficulty_percent integer, audio_usage_percent integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if period_days not between 1 and 365 then raise exception 'INVALID_PERIOD' using errcode = '22023'; end if;
  if not public.has_active_class_role(target_class_id, 'monitor') then raise exception 'monitor access required' using errcode = '42501'; end if;
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

revoke all on function public.get_participant_progress() from public;
revoke all on function public.get_participant_category_progress() from public;
revoke all on function public.get_monitor_class_progress(uuid, integer) from public;
revoke all on function public.get_monitor_mission_progress(uuid, integer) from public;
grant execute on function public.get_participant_progress() to authenticated;
grant execute on function public.get_participant_category_progress() to authenticated;
grant execute on function public.get_monitor_class_progress(uuid, integer) to authenticated;
grant execute on function public.get_monitor_mission_progress(uuid, integer) to authenticated;

commit;
