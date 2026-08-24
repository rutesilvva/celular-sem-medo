begin;

create type public.account_status as enum ('pending', 'active', 'blocked');

alter table public.profiles
  add column account_status public.account_status not null default 'pending',
  add column status_changed_at timestamptz not null default now(),
  add column blocked_at timestamptz,
  add column block_reason_code text,
  add constraint profiles_account_status_details check (
    (account_status <> 'blocked' and blocked_at is null and block_reason_code is null)
    or (
      account_status = 'blocked'
      and blocked_at is not null
      and block_reason_code is not null
      and block_reason_code ~ '^[A-Z][A-Z0-9_]{2,63}$'
    )
  );

create index profiles_account_status_idx on public.profiles (account_status);

create or replace function public.is_account_active(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = target_user_id
      and profile.account_status = 'active'
  );
$$;

create or replace function public.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_account_active()
    and exists (
      select 1
      from public.administrators administrator
      where administrator.user_id = (select auth.uid())
        and administrator.status = 'active'
    );
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
  select public.is_account_active()
    and exists (
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

create or replace function public.can_monitor_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_account_active()
    and exists (
      select 1
      from public.memberships viewer
      join public.memberships target on target.class_id = viewer.class_id
      join public.profiles target_profile on target_profile.id = target.user_id
      join public.classes class on class.id = viewer.class_id
      where viewer.user_id = (select auth.uid())
        and viewer.role = 'monitor'
        and viewer.status = 'active'
        and target.user_id = target_user_id
        and target.role = 'participant'
        and target.status = 'active'
        and target_profile.account_status = 'active'
        and class.status = 'active'
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
  where public.is_account_active()
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and class.status = 'active';
$$;

create or replace function public.get_my_auth_context()
returns table (
  user_id uuid,
  account_status public.account_status,
  error_code text,
  access_roles text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id,
    profile.account_status,
    case
      when profile.account_status = 'blocked' then 'ACCOUNT_BLOCKED'
      when profile.account_status = 'pending' then 'ACCOUNT_NOT_PROVISIONED'
      when not exists (select 1 from public.get_my_access_roles()) then 'ACCOUNT_NOT_PROVISIONED'
      else null
    end,
    case
      when profile.account_status = 'active'
        then coalesce(array(select distinct role.access_role from public.get_my_access_roles() role order by role.access_role), '{}'::text[])
      else '{}'::text[]
    end
  from public.profiles profile
  where profile.id = (select auth.uid());
$$;

create or replace function public.enforce_profile_account_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.account_status is distinct from old.account_status then
    new.status_changed_at := now();
    if new.account_status = 'blocked' then
      new.blocked_at := coalesce(new.blocked_at, now());
      if new.block_reason_code is null then
        raise exception 'block_reason_code is required when blocking an account';
      end if;
    else
      new.blocked_at := null;
      new.block_reason_code := null;
    end if;
  elsif row(new.account_status, new.status_changed_at, new.blocked_at, new.block_reason_code)
    is distinct from row(old.account_status, old.status_changed_at, old.blocked_at, old.block_reason_code) then
    raise exception 'account status details can only change with account_status';
  end if;
  return new;
end;
$$;

create trigger profiles_enforce_account_status
  before update on public.profiles
  for each row execute function public.enforce_profile_account_status();

revoke all on function public.is_account_active(uuid) from public;
revoke all on function public.get_my_auth_context() from public;
revoke all on function public.enforce_profile_account_status() from public;
grant execute on function public.is_account_active(uuid) to authenticated;
grant execute on function public.get_my_auth_context() to authenticated;

commit;
