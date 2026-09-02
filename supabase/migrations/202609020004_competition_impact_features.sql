begin;

create extension if not exists pg_trgm with schema extensions;

alter table public.preferences add column reduce_motion boolean not null default false;
alter table public.preferences add column haptic_feedback boolean not null default true;
alter table public.preferences add column repeat_instructions boolean not null default false;

create table public.mission_self_assessments (
  id uuid primary key,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid not null references public.class_mission_assignments(id) on delete restrict,
  attempt_id uuid references public.attempts(id) on delete set null,
  confidence_before smallint not null check (confidence_before between 1 and 5),
  confidence_after smallint check (confidence_after between 1 and 5),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint assessment_completion_pair check ((confidence_after is null) = (completed_at is null))
);
create index mission_self_assessments_participant_idx on public.mission_self_assessments(participant_id,created_at desc);
alter table public.mission_self_assessments enable row level security;
create policy assessments_select_own_or_admin on public.mission_self_assessments for select to authenticated using (participant_id=auth.uid() or public.is_global_admin());
revoke all on public.mission_self_assessments from anon,authenticated;
grant select on public.mission_self_assessments to authenticated;

create table public.learning_requests (
  id uuid primary key,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  normalized_query text not null,
  status text not null default 'open' check(status in ('open','planned','published','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_request_query_length check(char_length(normalized_query) between 3 and 160)
);
create index learning_requests_class_status_idx on public.learning_requests(class_id,status,created_at desc);
alter table public.learning_requests enable row level security;
create policy learning_requests_select_scope on public.learning_requests for select to authenticated using(participant_id=auth.uid() or public.is_global_admin());
revoke all on public.learning_requests from anon,authenticated;
grant select on public.learning_requests to authenticated;

create or replace function public.start_mission_self_assessment(requested_id uuid,target_assignment_id uuid,rating smallint)
returns uuid language plpgsql security definer set search_path='' as $$
begin
  if rating not between 1 and 5 or not exists(select 1 from public.get_participant_mission_catalog() c where c.assignment_id=target_assignment_id) then raise exception 'ASSESSMENT_NOT_ALLOWED' using errcode='42501'; end if;
  insert into public.mission_self_assessments(id,participant_id,assignment_id,confidence_before) values(requested_id,auth.uid(),target_assignment_id,rating) on conflict(id) do nothing;
  return requested_id;
end; $$;

create or replace function public.complete_mission_self_assessment(target_assessment_id uuid,target_attempt_id uuid,rating smallint)
returns integer language plpgsql security definer set search_path='' as $$
declare before_rating smallint;
begin
  if rating not between 1 and 5 then raise exception 'INVALID_CONFIDENCE' using errcode='22023'; end if;
  update public.mission_self_assessments assessment set attempt_id=target_attempt_id,confidence_after=rating,completed_at=now()
  where assessment.id=target_assessment_id and assessment.participant_id=auth.uid() and assessment.completed_at is null
    and exists(select 1 from public.attempts attempt where attempt.id=target_attempt_id and attempt.participant_id=auth.uid() and attempt.assignment_id=assessment.assignment_id and attempt.status='completed')
  returning confidence_before into before_rating;
  if before_rating is null then raise exception 'ASSESSMENT_NOT_FOUND' using errcode='42501'; end if;
  return rating-before_rating;
end; $$;

create or replace function public.create_learning_request(requested_id uuid,query text)
returns uuid language plpgsql security definer set search_path='' as $$
declare selected_class uuid;
begin
  select membership.class_id into selected_class from public.memberships membership join public.classes class on class.id=membership.class_id
  where membership.user_id=auth.uid() and membership.role='participant' and membership.status='active' and class.status='active' order by membership.joined_at desc limit 1;
  if selected_class is null or char_length(btrim(query)) not between 3 and 160 then raise exception 'LEARNING_REQUEST_NOT_ALLOWED' using errcode='22023'; end if;
  insert into public.learning_requests(id,participant_id,class_id,normalized_query) values(requested_id,auth.uid(),selected_class,lower(btrim(query)));
  return requested_id;
end; $$;

create or replace function public.get_personalized_mission_recommendations(search_query text default '')
returns table(assignment_id uuid,title text,category text,recommendation_score integer,recommendation_reason text)
language sql stable security definer set search_path='' as $$
  with catalog as (select * from public.get_participant_mission_catalog()), completed as (
    select attempt.assignment_id,count(*) total from public.attempts attempt where attempt.participant_id=auth.uid() and attempt.status='completed' group by attempt.assignment_id
  ), terms as (select regexp_split_to_array(lower(btrim(coalesce(search_query,''))),'\s+') values)
  select catalog.assignment_id,catalog.title,catalog.category,
    (case when completed.total is null then 40 else 0 end + case when catalog.is_required then 25 else 0 end +
      case when btrim(coalesce(search_query,''))='' then 10 when lower(catalog.title||' '||catalog.summary||' '||catalog.category) operator(extensions.%) lower(search_query) then 60 else 0 end)::integer,
    case when btrim(coalesce(search_query,''))<>'' and lower(catalog.title||' '||catalog.summary||' '||catalog.category) operator(extensions.%) lower(search_query) then 'Combina com o que você quer aprender'
      when completed.total is null then 'Uma habilidade nova para você' else 'Boa opção para praticar novamente' end
  from catalog left join completed using(assignment_id),terms
  where btrim(coalesce(search_query,''))='' or lower(catalog.title||' '||catalog.summary||' '||catalog.category) operator(extensions.%) lower(search_query)
    or lower(catalog.title||' '||catalog.summary||' '||catalog.category) like '%'||lower(search_query)||'%'
  order by 4 desc,catalog.title limit 12;
$$;

create or replace function public.get_admin_impact_summary(target_class_id uuid default null)
returns table(participants bigint,completed_missions bigint,autonomous_completions bigint,confidence_responses bigint,average_confidence_gain numeric,open_help_requests bigint,resolved_help_requests bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  return query select
    count(distinct membership.user_id) filter(where membership.role='participant' and membership.status='active'),
    count(distinct attempt.id) filter(where attempt.status='completed'),
    count(distinct attempt.id) filter(where attempt.status='completed' and not exists(select 1 from public.attempt_events event where event.attempt_id=attempt.id and event.event_type in ('hint_requested','help_requested'))),
    count(distinct assessment.id) filter(where assessment.completed_at is not null),
    round(avg(assessment.confidence_after-assessment.confidence_before) filter(where assessment.completed_at is not null),2),
    count(distinct help.id) filter(where help.status in ('open','in_progress')),
    count(distinct help.id) filter(where help.status='resolved')
  from public.memberships membership
  left join public.attempts attempt on attempt.participant_id=membership.user_id and attempt.class_id=membership.class_id
  left join public.mission_self_assessments assessment on assessment.attempt_id=attempt.id
  left join public.help_requests help on help.class_id=membership.class_id and help.participant_id=membership.user_id
  where (target_class_id is null or membership.class_id=target_class_id);
end; $$;

create or replace function public.get_admin_workshop_status(target_class_id uuid)
returns table(participant_id uuid,display_name text,current_mission text,current_step text,attempt_status public.attempt_status,open_help_count bigint,last_activity_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  return query select profile.id,profile.display_name,version.title,step.title,attempt.status,
    count(distinct help.id) filter(where help.status in ('open','in_progress')),max(attempt.last_activity_at)
  from public.memberships membership join public.profiles profile on profile.id=membership.user_id
  left join lateral(select a.* from public.attempts a where a.participant_id=membership.user_id and a.class_id=target_class_id order by a.last_activity_at desc limit 1) attempt on true
  left join public.mission_versions version on version.id=attempt.mission_version_id left join public.mission_steps step on step.id=attempt.current_step_id
  left join public.help_requests help on help.participant_id=membership.user_id and help.class_id=target_class_id
  where membership.class_id=target_class_id and membership.role='participant' and membership.status='active'
  group by profile.id,version.title,step.title,attempt.status order by max(attempt.last_activity_at) desc nulls last,profile.display_name;
end; $$;

revoke all on function public.start_mission_self_assessment(uuid,uuid,smallint),public.complete_mission_self_assessment(uuid,uuid,smallint),public.create_learning_request(uuid,text),public.get_personalized_mission_recommendations(text),public.get_admin_impact_summary(uuid),public.get_admin_workshop_status(uuid) from public;
grant execute on function public.start_mission_self_assessment(uuid,uuid,smallint),public.complete_mission_self_assessment(uuid,uuid,smallint),public.create_learning_request(uuid,text),public.get_personalized_mission_recommendations(text),public.get_admin_impact_summary(uuid),public.get_admin_workshop_status(uuid) to authenticated;

commit;
