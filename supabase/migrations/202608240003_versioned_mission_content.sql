begin;

alter table public.mission_steps
  add column safety_note text not null
    default 'Esta atividade acontece em um ambiente de simulação seguro.',
  add constraint mission_steps_safety_note_length
    check (char_length(btrim(safety_note)) between 1 and 1000),
  add constraint mission_steps_audio_required
    check (audio_text is not null and char_length(btrim(audio_text)) between 1 and 4000),
  add constraint mission_steps_help_required
    check (jsonb_typeof(hints) = 'array' and jsonb_array_length(hints) > 0);

create or replace function public.get_participant_mission_catalog()
returns table (
  assignment_id uuid,
  class_id uuid,
  mission_id uuid,
  mission_version_id uuid,
  version_number integer,
  title text,
  summary text,
  category text,
  difficulty public.mission_difficulty,
  estimated_minutes smallint,
  is_required boolean,
  available_from timestamptz,
  due_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    assignment.id,
    assignment.class_id,
    mission.id,
    version.id,
    version.version,
    version.title,
    version.description,
    mission.category,
    mission.difficulty,
    mission.estimated_minutes,
    assignment.is_required,
    assignment.available_from,
    assignment.due_at
  from public.class_mission_assignments assignment
  join public.mission_versions version on version.id = assignment.mission_version_id
  join public.missions mission on mission.id = version.mission_id
  where public.has_active_class_role(assignment.class_id, 'participant')
    and assignment.status = 'active'
    and assignment.available_from <= now()
    and (assignment.due_at is null or assignment.due_at > now())
    and version.status = 'published'
    and mission.status = 'active'
  order by assignment.is_required desc, assignment.available_from, version.title, assignment.id;
$$;

create or replace function public.get_participant_mission_details(target_assignment_id uuid)
returns table (
  assignment_id uuid,
  class_id uuid,
  mission_id uuid,
  mission_version_id uuid,
  version_number integer,
  title text,
  summary text,
  learning_objective text,
  category text,
  difficulty public.mission_difficulty,
  estimated_minutes smallint,
  is_required boolean,
  safety_note text,
  step_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    catalog.assignment_id,
    catalog.class_id,
    catalog.mission_id,
    catalog.mission_version_id,
    catalog.version_number,
    catalog.title,
    catalog.summary,
    version.learning_objective,
    catalog.category,
    catalog.difficulty,
    catalog.estimated_minutes,
    catalog.is_required,
    min(step.safety_note),
    count(step.id)::integer
  from public.get_participant_mission_catalog() catalog
  join public.mission_versions version on version.id = catalog.mission_version_id
  join public.mission_steps step on step.mission_version_id = catalog.mission_version_id
  where catalog.assignment_id = target_assignment_id
  group by
    catalog.assignment_id, catalog.class_id, catalog.mission_id,
    catalog.mission_version_id, catalog.version_number, catalog.title,
    catalog.summary, version.learning_objective, catalog.category,
    catalog.difficulty, catalog.estimated_minutes, catalog.is_required;
$$;

create or replace function public.get_participant_mission_steps(target_assignment_id uuid)
returns table (
  step_id uuid,
  mission_version_id uuid,
  step_position smallint,
  step_type public.mission_step_type,
  title text,
  instruction text,
  audio_text text,
  safety_note text,
  expected_action jsonb,
  options jsonb,
  hints jsonb,
  is_optional boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    step.id,
    step.mission_version_id,
    step.position,
    step.step_type,
    step.title,
    step.instruction,
    step.audio_text,
    step.safety_note,
    step.expected_action,
    step.options,
    step.hints,
    step.is_optional
  from public.get_participant_mission_catalog() catalog
  join public.mission_steps step on step.mission_version_id = catalog.mission_version_id
  where catalog.assignment_id = target_assignment_id
  order by step.position, step.id;
$$;

revoke all on function public.get_participant_mission_catalog() from public;
revoke all on function public.get_participant_mission_details(uuid) from public;
revoke all on function public.get_participant_mission_steps(uuid) from public;
grant execute on function public.get_participant_mission_catalog() to authenticated;
grant execute on function public.get_participant_mission_details(uuid) to authenticated;
grant execute on function public.get_participant_mission_steps(uuid) to authenticated;

commit;
