begin;

-- O produto passa a expor somente aluno e administrador global. O valor
-- histórico `monitor` permanece no enum para leitura de registros antigos.
insert into public.administrators (user_id, status, granted_by, granted_at)
select distinct membership.user_id, 'active'::public.administrator_status, null::uuid, now()
from public.memberships membership
where membership.role = 'monitor'
  and membership.status = 'active'
on conflict (user_id) do update
set status = 'active', revoked_at = null;

update public.memberships
set status = 'inactive', ended_at = coalesce(ended_at, now()), updated_at = now()
where role = 'monitor' and status = 'active';

create or replace function public.reject_active_monitor_membership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- `postgres` é reservado a migrações/testes legados; nenhuma sessão da API
  -- (authenticator, authenticated ou service_role) pode reativar o papel.
  if new.role = 'monitor' and new.status = 'active' and session_user <> 'postgres' then
    raise exception 'MONITOR_ROLE_REMOVED' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger memberships_reject_removed_monitor_role
before insert or update on public.memberships
for each row execute function public.reject_active_monitor_membership();

create or replace function public.get_my_access_roles()
returns table (access_role text, scope_id uuid)
language sql stable security definer set search_path = '' as $$
  select 'admin'::text, null::uuid
  where public.is_global_admin()
  union all
  select 'participant'::text, membership.class_id
  from public.memberships membership
  join public.classes class on class.id = membership.class_id
  where public.is_account_active()
    and membership.user_id = auth.uid()
    and membership.role = 'participant'
    and membership.status = 'active'
    and class.status = 'active';
$$;

-- Funções legadas continuam com o mesmo nome para não quebrar clientes já
-- publicados, mas a autorização passa a exigir administrador global.
create or replace function public.has_active_class_role(target_class_id uuid, required_role public.app_role default null)
returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when required_role = 'monitor' then (
      public.is_global_admin()
      or (session_user = 'postgres' and exists (
        select 1 from public.memberships legacy
        where legacy.class_id = target_class_id and legacy.user_id = auth.uid()
          and legacy.role = 'monitor' and legacy.status = 'active'
      ))
    ) and exists (select 1 from public.classes class where class.id = target_class_id and class.status = 'active')
    else public.is_account_active() and exists (
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

create or replace function public.is_class_monitor(target_class_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_active_class_role(target_class_id, 'monitor');
$$;

create or replace function public.can_monitor_user(target_user_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select (public.is_global_admin() or (session_user = 'postgres' and exists (
    select 1 from public.memberships viewer
    join public.memberships target on target.class_id = viewer.class_id
    where viewer.user_id = auth.uid() and viewer.role = 'monitor' and viewer.status = 'active'
      and target.user_id = target_user_id and target.role = 'participant' and target.status = 'active'
  ))) and exists (select 1 from public.profiles profile where profile.id = target_user_id);
$$;

create or replace function public.get_admin_class_contexts()
returns table (
  membership_id uuid,
  class_id uuid,
  class_name text,
  class_shift text,
  access_role text,
  joined_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_global_admin() then
    raise exception 'ADMIN_ACCESS_REQUIRED' using errcode = '42501';
  end if;
  return query
  select null::uuid, class.id, class.name, class.shift, 'admin'::text, class.created_at
  from public.classes class
  where class.status = 'active'
  order by class.name;
end;
$$;

alter table public.class_mission_assignments
  drop constraint if exists class_mission_assignments_monitor_membership_fk;
alter table public.class_mission_assignments
  add constraint class_mission_assignments_assigned_by_profile_fk
  foreign key (assigned_by) references public.profiles(id) on delete restrict;

alter table public.help_requests
  drop constraint if exists help_requests_assigned_monitor_membership_fk;
alter table public.help_requests
  add constraint help_requests_assigned_admin_profile_fk
  foreign key (assigned_monitor_id) references public.profiles(id) on delete restrict;

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
      select membership.user_id, new.id, 'help_requested',
        'Há um novo pedido de ajuda no aplicativo.', '/admin/help-requests?id=' || new.id::text
      from public.memberships membership
      where membership.class_id = new.class_id and membership.role = 'monitor'
        and membership.status = 'active'
        and not exists (
          select 1 from public.administrators administrator
          where administrator.user_id = membership.user_id and administrator.status = 'active'
        );
    end if;
  elsif new.status is distinct from old.status or new.resolution_code is distinct from old.resolution_code then
    insert into public.push_outbox(recipient_id, help_request_id, event_type, body, route)
    values (new.participant_id, new.id, 'help_updated', 'Seu pedido de ajuda foi atualizado.', '/participant/help-requests?id=' || new.id::text);
  end if;
  return new;
end;
$$;

revoke all on function public.get_admin_class_contexts() from public;
revoke all on function public.reject_active_monitor_membership() from public;
grant execute on function public.get_admin_class_contexts() to authenticated;

commit;
