begin;

-- Atribuições criadas pela plataforma não representam a ação de uma pessoa
-- administradora. Permitir autoria nula mantém a trilha de auditoria honesta e
-- preserva o vínculo de turma exigido por tentativas, progresso e RLS.
alter table public.class_mission_assignments
  alter column assigned_by drop not null,
  alter column assigned_by_role drop not null;

alter table public.class_mission_assignments
  add constraint class_mission_assignments_assignment_source_check
  check (
    (assigned_by is null and assigned_by_role is null)
    or (assigned_by is not null and assigned_by_role = 'admin')
  );

create or replace function public.sync_public_mission_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' then
    insert into public.class_mission_assignments (
      class_id,
      mission_version_id,
      assigned_by,
      assigned_by_role,
      status,
      is_required,
      available_from,
      due_at
    )
    values (
      'c5100000-0000-4000-8000-000000000001',
      new.id,
      null,
      null,
      'active',
      false,
      now(),
      null
    )
    on conflict on constraint class_mission_assignments_class_version_key
    do update set
      status = 'active',
      available_from = least(public.class_mission_assignments.available_from, excluded.available_from),
      due_at = null,
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists sync_public_mission_assignment_after_publish on public.mission_versions;
create trigger sync_public_mission_assignment_after_publish
after insert or update of status on public.mission_versions
for each row execute function public.sync_public_mission_assignment();

-- Disponibiliza imediatamente todo o catálogo já publicado.
insert into public.class_mission_assignments (
  class_id,
  mission_version_id,
  assigned_by,
  assigned_by_role,
  status,
  is_required,
  available_from,
  due_at
)
select
  'c5100000-0000-4000-8000-000000000001',
  version.id,
  null,
  null,
  'active',
  false,
  now(),
  null
from public.mission_versions version
join public.missions mission on mission.id = version.mission_id
where version.status = 'published'
  and mission.status = 'active'
on conflict on constraint class_mission_assignments_class_version_key
do update set
  status = 'active',
  available_from = least(public.class_mission_assignments.available_from, excluded.available_from),
  due_at = null,
  updated_at = now();

revoke all on function public.sync_public_mission_assignment() from public;

commit;
