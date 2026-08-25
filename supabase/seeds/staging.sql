-- Seed idempotente exclusivo de staging.
-- Antes de executar, marque contas Google sintéticas em auth.users.raw_app_meta_data:
--   csm_staging_role = monitor | participant
--   csm_staging_class = conectados
-- Não use contas pessoais nem execute este arquivo em production.

begin;

do $$
declare
  monitor_id uuid;
  class_id uuid := '75000000-0000-4000-8000-000000000001';
begin
  if not exists (
    select 1 from auth.users
    where raw_app_meta_data ->> 'csm_staging_class' = 'conectados'
      and raw_app_meta_data ->> 'csm_staging_role' = 'monitor'
  ) or not exists (
    select 1 from auth.users
    where raw_app_meta_data ->> 'csm_staging_class' = 'conectados'
      and raw_app_meta_data ->> 'csm_staging_role' = 'participant'
  ) then
    raise exception 'staging seed requires at least one tagged monitor and one tagged participant';
  end if;

  select id into strict monitor_id
  from auth.users
  where raw_app_meta_data ->> 'csm_staging_class' = 'conectados'
    and raw_app_meta_data ->> 'csm_staging_role' = 'monitor'
  order by created_at
  limit 1;

  update public.profiles profile
  set account_status = 'active'
  from auth.users auth_user
  where profile.id = auth_user.id
    and auth_user.raw_app_meta_data ->> 'csm_staging_class' = 'conectados'
    and auth_user.raw_app_meta_data ->> 'csm_staging_role' in ('monitor', 'participant');

  insert into public.classes (id, name, slug, shift, status, created_by)
  values (class_id, 'Turma Conectados', 'staging-turma-conectados', 'manhã', 'active', monitor_id)
  on conflict (id) do update set
    name = excluded.name,
    shift = excluded.shift,
    status = excluded.status,
    created_by = excluded.created_by;

  insert into public.memberships (class_id, user_id, role, status)
  select
    class_id,
    auth_user.id,
    (auth_user.raw_app_meta_data ->> 'csm_staging_role')::public.app_role,
    'active'::public.membership_status
  from auth.users auth_user
  where auth_user.raw_app_meta_data ->> 'csm_staging_class' = 'conectados'
    and auth_user.raw_app_meta_data ->> 'csm_staging_role' in ('monitor', 'participant')
  on conflict on constraint memberships_one_role_per_class_user_key do update set
    role = excluded.role,
    status = 'active',
    ended_at = null,
    updated_at = now();

  insert into public.class_mission_assignments (
    id, class_id, mission_version_id, assigned_by, status, is_required, available_from
  )
  values
    ('76000000-0000-4000-8000-000000000001', class_id, '20000000-0000-4000-8000-000000000001', monitor_id, 'active', true, now()),
    ('76000000-0000-4000-8000-000000000002', class_id, '20000000-0000-4000-8000-000000000004', monitor_id, 'active', false, now()),
    ('76000000-0000-4000-8000-000000000003', class_id, '20000000-0000-4000-8000-000000000005', monitor_id, 'active', false, now()),
    ('76000000-0000-4000-8000-000000000004', class_id, '20000000-0000-4000-8000-000000000006', monitor_id, 'active', false, now())
  on conflict (class_id, mission_version_id) do update set
    assigned_by = excluded.assigned_by,
    status = excluded.status,
    is_required = excluded.is_required,
    available_from = excluded.available_from,
    due_at = null,
    updated_at = now();
end;
$$;

commit;
