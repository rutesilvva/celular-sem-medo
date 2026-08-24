begin;

create or replace function public.get_my_class_contexts()
returns table (
  membership_id uuid,
  class_id uuid,
  class_name text,
  class_shift text,
  access_role public.app_role,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    membership.id,
    class.id,
    class.name,
    class.shift,
    membership.role,
    membership.joined_at
  from public.memberships membership
  join public.classes class on class.id = membership.class_id
  where public.is_account_active()
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and class.status = 'active'
  order by membership.joined_at, class.name, membership.role;
$$;

create or replace function public.get_monitor_class_participants(target_class_id uuid)
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
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_active_class_role(target_class_id, 'monitor') then
    raise exception 'monitor access required' using errcode = '42501';
  end if;

  return query
  with available_assignments as (
    select assignment.id
    from public.class_mission_assignments assignment
    where assignment.class_id = target_class_id
      and assignment.status = 'active'
      and assignment.available_from <= now()
      and (assignment.due_at is null or assignment.due_at > now())
  ),
  assignment_total as (
    select count(*)::integer as value from available_assignments
  ),
  participant_attempts as (
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

create or replace function public.get_monitor_participant(
  target_class_id uuid,
  target_participant_id uuid
)
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
language sql
stable
security definer
set search_path = ''
as $$
  select participant.*
  from public.get_monitor_class_participants(target_class_id) participant
  where participant.participant_id = target_participant_id;
$$;

revoke all on function public.get_my_class_contexts() from public;
revoke all on function public.get_monitor_class_participants(uuid) from public;
revoke all on function public.get_monitor_participant(uuid, uuid) from public;
grant execute on function public.get_my_class_contexts() to authenticated;
grant execute on function public.get_monitor_class_participants(uuid) to authenticated;
grant execute on function public.get_monitor_participant(uuid, uuid) to authenticated;

commit;
