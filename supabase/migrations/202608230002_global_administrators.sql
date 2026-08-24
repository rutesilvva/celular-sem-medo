create type public.administrator_status as enum ('active', 'revoked');

create type public.admin_audit_action as enum (
  'administrator_granted',
  'administrator_revoked',
  'membership_revoked',
  'account_deactivation_requested',
  'class_archived'
);

create table public.administrators (
  user_id uuid primary key references public.profiles (id) on delete restrict,
  status public.administrator_status not null default 'active',
  granted_by uuid references public.profiles (id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint administrators_status_dates check (
    (status = 'active' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  ),
  constraint administrators_not_self_granted check (granted_by is null or granted_by <> user_id)
);

create index administrators_active_idx
  on public.administrators (granted_at desc)
  where status = 'active';

create table public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles (id) on delete set null,
  action public.admin_audit_action not null,
  target_user_id uuid references public.profiles (id) on delete set null,
  class_id uuid references public.classes (id) on delete set null,
  target_role public.app_role,
  request_id uuid not null default gen_random_uuid(),
  occurred_at timestamptz not null default now()
);

create index admin_audit_events_occurred_idx
  on public.admin_audit_events (occurred_at desc);
create index admin_audit_events_target_user_idx
  on public.admin_audit_events (target_user_id, occurred_at desc)
  where target_user_id is not null;

create or replace function public.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.administrators administrator
    where administrator.user_id = (select auth.uid())
      and administrator.status = 'active'
  );
$$;

create or replace function public.get_my_access_roles()
returns table (access_role text, scope_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select 'admin'::text, null::uuid
  where public.is_global_admin()

  union all

  select membership.role::text, membership.class_id
  from public.memberships membership
  join public.classes class on class.id = membership.class_id
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and class.status = 'active';
$$;

create or replace function public.prevent_last_active_administrator_removal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'active'
    and (
      tg_op = 'DELETE'
      or (tg_op = 'UPDATE' and new.status = 'revoked')
    ) then
    perform pg_advisory_xact_lock(hashtextextended('csm-last-active-administrator', 0));

    if not exists (
      select 1
      from public.administrators administrator
      where administrator.user_id <> old.user_id
        and administrator.status = 'active'
    ) then
      raise exception 'the last active administrator cannot be removed';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.admin_revoke_membership(
  target_class_id uuid,
  target_user_id uuid,
  target_role public.app_role
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership_revoked boolean;
begin
  if (select auth.uid()) is null or not public.is_global_admin() then
    raise exception 'global administrator access required' using errcode = '42501';
  end if;

  update public.memberships membership
  set
    status = 'inactive',
    ended_at = now(),
    updated_at = now()
  where membership.class_id = target_class_id
    and membership.user_id = target_user_id
    and membership.role = target_role
    and membership.status = 'active';

  membership_revoked := found;

  if membership_revoked then
    insert into public.admin_audit_events (
      admin_user_id,
      action,
      target_user_id,
      class_id,
      target_role
    )
    values (
      (select auth.uid()),
      'membership_revoked',
      target_user_id,
      target_class_id,
      target_role
    );
  end if;

  return membership_revoked;
end;
$$;

create trigger administrators_set_updated_at
  before update on public.administrators
  for each row execute function public.set_updated_at();

create trigger administrators_prevent_last_active_removal
  before update or delete on public.administrators
  for each row execute function public.prevent_last_active_administrator_removal();

alter table public.administrators enable row level security;
alter table public.admin_audit_events enable row level security;

create policy administrators_select_global_admin
  on public.administrators for select to authenticated
  using (public.is_global_admin());

create policy admin_audit_events_select_global_admin
  on public.admin_audit_events for select to authenticated
  using (public.is_global_admin());

create policy profiles_select_global_admin
  on public.profiles for select to authenticated
  using (public.is_global_admin());
create policy classes_select_global_admin
  on public.classes for select to authenticated
  using (public.is_global_admin());
create policy classes_update_global_admin
  on public.classes for update to authenticated
  using (public.is_global_admin())
  with check (public.is_global_admin());
create policy memberships_select_global_admin
  on public.memberships for select to authenticated
  using (public.is_global_admin());
create policy invitations_select_global_admin
  on public.invitations for select to authenticated
  using (public.is_global_admin());
create policy missions_select_global_admin
  on public.missions for select to authenticated
  using (public.is_global_admin());
create policy mission_versions_select_global_admin
  on public.mission_versions for select to authenticated
  using (public.is_global_admin());
create policy mission_steps_select_global_admin
  on public.mission_steps for select to authenticated
  using (public.is_global_admin());
create policy assignments_select_global_admin
  on public.class_mission_assignments for select to authenticated
  using (public.is_global_admin());
create policy assignments_insert_global_admin
  on public.class_mission_assignments for insert to authenticated
  with check (public.is_global_admin());
create policy assignments_update_global_admin
  on public.class_mission_assignments for update to authenticated
  using (public.is_global_admin())
  with check (public.is_global_admin());
create policy assignments_delete_global_admin
  on public.class_mission_assignments for delete to authenticated
  using (public.is_global_admin());
create policy attempts_select_global_admin
  on public.attempts for select to authenticated
  using (public.is_global_admin());
create policy attempt_events_select_global_admin
  on public.attempt_events for select to authenticated
  using (public.is_global_admin());
create policy preferences_select_global_admin
  on public.preferences for select to authenticated
  using (public.is_global_admin());
create policy help_requests_select_global_admin
  on public.help_requests for select to authenticated
  using (public.is_global_admin());
create policy help_requests_update_global_admin
  on public.help_requests for update to authenticated
  using (public.is_global_admin())
  with check (public.is_global_admin());

revoke all on table public.administrators from anon, authenticated;
revoke all on table public.admin_audit_events from anon, authenticated;
grant select on table public.administrators to authenticated;
grant select on table public.admin_audit_events to authenticated;

revoke all on function public.is_global_admin() from public;
revoke all on function public.get_my_access_roles() from public;
revoke all on function public.admin_revoke_membership(uuid, uuid, public.app_role) from public;
revoke all on function public.prevent_last_active_administrator_removal() from public;

grant execute on function public.is_global_admin() to authenticated;
grant execute on function public.get_my_access_roles() to authenticated;
grant execute on function public.admin_revoke_membership(uuid, uuid, public.app_role) to authenticated;

grant all on table public.administrators to service_role;
grant all on table public.admin_audit_events to service_role;
grant execute on function public.prevent_last_active_administrator_removal() to service_role;
