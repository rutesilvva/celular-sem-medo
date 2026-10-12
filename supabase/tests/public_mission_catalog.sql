begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select is(
  (
    select count(*)
    from public.class_mission_assignments assignment
    join public.mission_versions version on version.id = assignment.mission_version_id
    join public.missions mission on mission.id = version.mission_id
    where assignment.class_id = 'c5100000-0000-4000-8000-000000000001'
      and assignment.status = 'active'
      and version.status = 'published'
      and mission.status = 'active'
  ),
  (
    select count(*)
    from public.mission_versions version
    join public.missions mission on mission.id = version.mission_id
    where version.status = 'published' and mission.status = 'active'
  ),
  'the public class contains every active published mission version'
);

select is(
  (
    select count(*)
    from public.class_mission_assignments
    where class_id = 'c5100000-0000-4000-8000-000000000001'
      and (assigned_by is not null or assigned_by_role is not null)
  ),
  0::bigint,
  'platform assignments do not impersonate an administrator'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values (
  'c5200000-0000-4000-8000-000000000010',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'public-catalog@test.invalid', '',
  now(), now(), now(),
  '{"provider":"google","providers":["google"]}',
  '{"name":"Catálogo Público"}'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"c5200000-0000-4000-8000-000000000010","role":"authenticated"}',
  true
);

select ok(
  (select count(*) from public.get_participant_mission_catalog()) > 0,
  'a newly registered student can see published missions without joining a private class'
);

select is(
  (select count(*) from public.get_participant_mission_catalog()),
  (
    select count(*)
    from public.class_mission_assignments assignment
    join public.mission_versions version on version.id = assignment.mission_version_id
    join public.missions mission on mission.id = version.mission_id
    where assignment.class_id = 'c5100000-0000-4000-8000-000000000001'
      and assignment.status = 'active'
      and assignment.available_from <= now()
      and (assignment.due_at is null or assignment.due_at > now())
      and version.status = 'published'
      and mission.status = 'active'
  ),
  'the student catalog includes all currently available public missions'
);

select is(
  (select count(*) from public.administrators where user_id = 'c5200000-0000-4000-8000-000000000010'),
  0::bigint,
  'public catalog access never grants administrator privileges'
);

select * from finish();
rollback;
