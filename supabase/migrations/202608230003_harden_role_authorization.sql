begin;

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
    join public.classes class on class.id = membership.class_id
    where membership.class_id = target_class_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and class.status = 'active'
      and (required_role is null or membership.role = required_role)
  );
$$;

create or replace function public.has_any_active_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_global_admin()
    or exists (
      select 1
      from public.memberships membership
      join public.classes class on class.id = membership.class_id
      where membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and class.status = 'active'
    );
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
    join public.classes class on class.id = viewer.class_id
    where viewer.user_id = (select auth.uid())
      and viewer.role = 'monitor'
      and viewer.status = 'active'
      and target.user_id = target_user_id
      and target.role = 'participant'
      and target.status = 'active'
      and class.status = 'active'
  );
$$;

create unique index memberships_one_role_per_class_user_idx
  on public.memberships (class_id, user_id);

drop policy missions_select_active on public.missions;
create policy missions_select_active_authorized
  on public.missions for select to authenticated
  using (status = 'active' and public.has_any_active_access());

drop policy mission_versions_select_published on public.mission_versions;
create policy mission_versions_select_published_authorized
  on public.mission_versions for select to authenticated
  using (public.has_any_active_access() and public.is_published_mission_version(id));

drop policy mission_steps_select_published on public.mission_steps;
create policy mission_steps_select_published_authorized
  on public.mission_steps for select to authenticated
  using (public.has_any_active_access() and public.is_published_mission_version(mission_version_id));

drop policy assignments_select_members on public.class_mission_assignments;
create policy assignments_select_by_role
  on public.class_mission_assignments for select to authenticated
  using (
    public.is_class_monitor(class_id)
    or (
      public.has_active_class_role(class_id, 'participant')
      and public.is_assignment_available(id, class_id, mission_version_id)
    )
  );

drop policy memberships_select_self_or_monitor on public.memberships;
create policy memberships_select_active_self_or_monitor
  on public.memberships for select to authenticated
  using (
    (user_id = (select auth.uid()) and status = 'active' and public.is_active_class_member(class_id))
    or public.is_class_monitor(class_id)
  );

drop policy attempts_select_owner_or_monitor on public.attempts;
create policy attempts_select_active_owner
  on public.attempts for select to authenticated
  using (
    participant_id = (select auth.uid())
    and public.has_active_class_role(class_id, 'participant')
  );

drop policy attempt_events_select_owner_or_monitor on public.attempt_events;
create policy attempt_events_select_active_owner
  on public.attempt_events for select to authenticated
  using (
    participant_id = (select auth.uid())
    and public.has_active_class_role(class_id, 'participant')
  );

drop policy help_requests_select_owner_or_monitor on public.help_requests;
create policy help_requests_select_active_owner_or_monitor
  on public.help_requests for select to authenticated
  using (
    (participant_id = (select auth.uid()) and public.has_active_class_role(class_id, 'participant'))
    or public.is_class_monitor(class_id)
  );

create or replace function public.get_monitor_attempt_summaries(target_class_id uuid)
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
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_class_monitor(target_class_id) and not public.is_global_admin() then
    raise exception 'monitor access required' using errcode = '42501';
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

create or replace function public.get_monitor_attempt_event_summaries(
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
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_class_monitor(target_class_id) and not public.is_global_admin() then
    raise exception 'monitor access required' using errcode = '42501';
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

revoke all on function public.has_any_active_access() from public;
revoke all on function public.get_monitor_attempt_summaries(uuid) from public;
revoke all on function public.get_monitor_attempt_event_summaries(uuid, uuid) from public;
grant execute on function public.has_any_active_access() to authenticated;
grant execute on function public.get_monitor_attempt_summaries(uuid) to authenticated;
grant execute on function public.get_monitor_attempt_event_summaries(uuid, uuid) to authenticated;

commit;
