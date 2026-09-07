begin;

create table public.retention_checks (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid not null references public.class_mission_assignments(id) on delete cascade,
  source_attempt_id uuid not null references public.attempts(id) on delete cascade,
  due_at timestamptz not null,
  answered_correctly boolean,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique(participant_id,source_attempt_id)
);
create index retention_checks_due_idx on public.retention_checks(participant_id,due_at) where answered_at is null;
alter table public.retention_checks enable row level security;
create policy retention_checks_read_scope on public.retention_checks for select to authenticated
using(participant_id=auth.uid() or public.is_global_admin());
revoke all on public.retention_checks from anon,authenticated;
grant select on public.retention_checks to authenticated;

create or replace function public.schedule_retention_check() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='completed' and (old.status is distinct from 'completed') then
    insert into public.retention_checks(participant_id,assignment_id,source_attempt_id,due_at)
    values(new.participant_id,new.assignment_id,new.id,coalesce(new.completed_at,now())+interval '3 days') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger attempts_schedule_retention after update of status on public.attempts
for each row execute function public.schedule_retention_check();

create or replace function public.get_personalized_mission_recommendations(search_query text default '')
returns table(assignment_id uuid,title text,category text,recommendation_score integer,recommendation_reason text)
language sql stable security definer set search_path='' as $$
  with catalog as (select * from public.get_participant_mission_catalog()),
  completed as (select a.assignment_id,count(*) total from public.attempts a where a.participant_id=auth.uid() and a.status='completed' group by a.assignment_id),
  diagnostic as (select d.* from public.learning_diagnostics d where d.participant_id=auth.uid())
  select catalog.assignment_id,catalog.title,catalog.category,
    (case when completed.total is null then 40 else 0 end + case when catalog.is_required then 25 else 0 end
      + case when diagnostic.goals @> array[catalog.category] then 20 else 0 end
      + case when coalesce((diagnostic.category_confidence->>catalog.category)::integer,5)<=2 then 20 else 0 end
      + case when diagnostic.scam_response is distinct from 'verify_known_contact' and lower(catalog.category) like '%seguran%' then 30 else 0 end
      + case when btrim(coalesce(search_query,''))='' then 10 when lower(catalog.title||' '||catalog.summary||' '||catalog.category) operator(extensions.%) lower(search_query) then 60 else 0 end)::integer,
    case when btrim(coalesce(search_query,''))<>'' and lower(catalog.title||' '||catalog.summary||' '||catalog.category) operator(extensions.%) lower(search_query) then 'Recomendamos porque combina com o que você pesquisou.'
      when diagnostic.goals @> array[catalog.category] and diagnostic.scam_response is distinct from 'verify_known_contact' and lower(catalog.category) like '%seguran%' then 'Recomendamos porque esta categoria está nos seus objetivos e você quer praticar decisões seguras contra golpes.'
      when diagnostic.scam_response is distinct from 'verify_known_contact' and lower(catalog.category) like '%seguran%' then 'Recomendamos para praticar decisões seguras contra golpes.'
      when coalesce((diagnostic.category_confidence->>catalog.category)::integer,5)<=2 then 'Recomendamos porque você indicou pouca confiança nesta categoria.'
      when diagnostic.goals @> array[catalog.category] then 'Recomendamos porque esta categoria está entre seus objetivos.'
      when completed.total is null then 'Recomendamos por ser uma habilidade nova para você.' else 'Recomendamos para fortalecer uma habilidade já praticada.' end
  from catalog left join completed using(assignment_id) left join diagnostic on true
  where btrim(coalesce(search_query,''))='' or lower(catalog.title||' '||catalog.summary||' '||catalog.category) operator(extensions.%) lower(search_query)
    or lower(catalog.title||' '||catalog.summary||' '||catalog.category) like '%'||lower(search_query)||'%'
  order by 4 desc,catalog.title limit 12;
$$;

create or replace function public.get_my_evolution_timeline()
returns table(occurred_at timestamptz,title text,category text,confidence_before smallint,confidence_after smallint,confidence_gain integer,autonomous boolean,help_count bigint)
language sql stable security definer set search_path='' as $$
  select a.completed_at,v.title,m.category,s.confidence_before,s.confidence_after,
    case when s.confidence_after is null then null else s.confidence_after-s.confidence_before end,
    not exists(select 1 from public.attempt_events e where e.attempt_id=a.id and e.event_type in ('hint_requested','help_requested')),
    (select count(*) from public.attempt_events e where e.attempt_id=a.id and e.event_type in ('hint_requested','help_requested'))
  from public.attempts a join public.mission_versions v on v.id=a.mission_version_id join public.missions m on m.id=v.mission_id
  left join public.mission_self_assessments s on s.attempt_id=a.id and s.participant_id=auth.uid()
  where a.participant_id=auth.uid() and a.status='completed' order by a.completed_at desc limit 100;
$$;

create or replace function public.get_my_retention_checks()
returns table(check_id uuid,assignment_id uuid,title text,question text,due_at timestamptz,is_due boolean,answered_correctly boolean)
language sql stable security definer set search_path='' as $$
  select r.id,r.assignment_id,v.title,coalesce(step.instruction,'Você ainda lembra como realizar esta missão com segurança?'),r.due_at,r.due_at<=now(),r.answered_correctly
  from public.retention_checks r join public.class_mission_assignments a on a.id=r.assignment_id join public.mission_versions v on v.id=a.mission_version_id
  left join lateral(select s.instruction from public.mission_steps s where s.mission_version_id=v.id order by s.position desc limit 1) step on true
  where r.participant_id=auth.uid() order by (r.answered_at is null) desc,r.due_at limit 30;
$$;

create or replace function public.answer_my_retention_check(target_check_id uuid,was_correct boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.retention_checks set answered_correctly=was_correct,answered_at=now()
  where id=target_check_id and participant_id=auth.uid() and answered_at is null and due_at<=now();
  if not found then raise exception 'RETENTION_CHECK_NOT_AVAILABLE' using errcode='42501'; end if;
  return was_correct;
end $$;

create or replace function public.get_admin_pre_post_impact(target_class_id uuid default null)
returns table(participants bigint,confidence_before numeric,confidence_after numeric,confidence_gain numeric,autonomy_first numeric,autonomy_latest numeric,help_first bigint,help_latest bigint,scam_recognition_percent numeric,retention_percent numeric)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  return query with members as (
    select distinct mem.user_id from public.memberships mem where mem.role='participant' and mem.status='active' and (target_class_id is null or mem.class_id=target_class_id)
  ), scoped as (
    select a.*,row_number() over(partition by a.participant_id order by a.started_at) first_rank,row_number() over(partition by a.participant_id order by a.started_at desc) latest_rank
    from public.attempts a join members mem on mem.user_id=a.participant_id where a.status='completed' and (target_class_id is null or a.class_id=target_class_id)
  ), attempt_metrics as (
    select s.*,not exists(select 1 from public.attempt_events e where e.attempt_id=s.id and e.event_type in ('hint_requested','help_requested')) autonomous,
      (select count(*) from public.attempt_events e where e.attempt_id=s.id and e.event_type='help_requested') helps from scoped s
  ), assessment_summary as (
    select round(avg(ms.confidence_before),2) before_value,round(avg(ms.confidence_after),2) after_value,round(avg(ms.confidence_after-ms.confidence_before),2) gain
    from public.mission_self_assessments ms join members mem on mem.user_id=ms.participant_id join public.attempts a on a.id=ms.attempt_id
    where ms.completed_at is not null and (target_class_id is null or a.class_id=target_class_id)
  ), attempt_summary as (
    select round(100.0*count(*) filter(where first_rank=1 and autonomous)/nullif(count(*) filter(where first_rank=1),0),1) first_autonomy,
      round(100.0*count(*) filter(where latest_rank=1 and autonomous)/nullif(count(*) filter(where latest_rank=1),0),1) latest_autonomy,
      coalesce(sum(helps) filter(where first_rank=1),0)::bigint first_help,coalesce(sum(helps) filter(where latest_rank=1),0)::bigint latest_help from attempt_metrics
  ), diagnostic_summary as (
    select round(100.0*count(*) filter(where d.scam_response='verify_known_contact')/nullif(count(*),0),1) safe_percent
    from public.learning_diagnostics d join members mem on mem.user_id=d.participant_id
  ), retention_summary as (
    select round(100.0*count(*) filter(where r.answered_correctly)/nullif(count(*) filter(where r.answered_at is not null),0),1) retained_percent
    from public.retention_checks r join members mem on mem.user_id=r.participant_id join public.class_mission_assignments a on a.id=r.assignment_id
    where target_class_id is null or a.class_id=target_class_id
  ) select (select count(*) from members),assessment.before_value,assessment.after_value,assessment.gain,
    attempts.first_autonomy,attempts.latest_autonomy,attempts.first_help,attempts.latest_help,diagnostic.safe_percent,retention.retained_percent
  from assessment_summary assessment cross join attempt_summary attempts cross join diagnostic_summary diagnostic cross join retention_summary retention;
end $$;

revoke all on function public.get_my_evolution_timeline(),public.get_my_retention_checks(),public.answer_my_retention_check(uuid,boolean),public.get_admin_pre_post_impact(uuid) from public;
grant execute on function public.get_my_evolution_timeline(),public.get_my_retention_checks(),public.answer_my_retention_check(uuid,boolean),public.get_admin_pre_post_impact(uuid) to authenticated;

commit;
