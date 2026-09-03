begin;

create table public.learning_diagnostics (
  id uuid primary key,
  participant_id uuid not null unique references public.profiles(id) on delete cascade,
  experience_level text not null check (experience_level in ('beginner','sometimes','independent')),
  preferred_format text not null check (preferred_format in ('read','listen','practice')),
  goals text[] not null check (cardinality(goals) between 1 and 6),
  category_confidence jsonb not null check (jsonb_typeof(category_confidence) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.learning_diagnostics enable row level security;
create policy learning_diagnostics_read_scope on public.learning_diagnostics for select to authenticated
  using (participant_id = auth.uid() or public.is_global_admin());
revoke all on public.learning_diagnostics from anon, authenticated;
grant select on public.learning_diagnostics to authenticated;

create table public.mission_review_schedules (
  participant_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid not null references public.class_mission_assignments(id) on delete cascade,
  interval_days smallint not null check (interval_days in (1,3,7,14,30)),
  completed_count integer not null check (completed_count > 0),
  reason_code text not null check (reason_code in ('needs_support','low_confidence','first_review','continued_practice')),
  last_completed_at timestamptz not null,
  next_review_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (participant_id, assignment_id)
);
create index mission_review_schedules_due_idx on public.mission_review_schedules(participant_id,next_review_at);
alter table public.mission_review_schedules enable row level security;
create policy mission_review_schedules_read_scope on public.mission_review_schedules for select to authenticated
  using (participant_id = auth.uid() or public.is_global_admin());
revoke all on public.mission_review_schedules from anon, authenticated;
grant select on public.mission_review_schedules to authenticated;

create table public.daily_mission_choices (
  participant_id uuid not null references public.profiles(id) on delete cascade,
  choice_date date not null default current_date,
  assignment_id uuid not null references public.class_mission_assignments(id) on delete cascade,
  reason_code text not null check (reason_code in ('review_due','required_new','personalized','daily_practice')),
  created_at timestamptz not null default now(),
  primary key (participant_id, choice_date)
);
alter table public.daily_mission_choices enable row level security;
create policy daily_mission_choices_read_scope on public.daily_mission_choices for select to authenticated
  using (participant_id = auth.uid() or public.is_global_admin());
revoke all on public.daily_mission_choices from anon, authenticated;
grant select on public.daily_mission_choices to authenticated;

create or replace function public.save_my_learning_diagnostic(
  requested_id uuid,
  selected_experience text,
  selected_format text,
  selected_goals text[],
  selected_confidence jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare item jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.memberships m join public.classes c on c.id=m.class_id
    where m.user_id=auth.uid() and m.role='participant' and m.status='active' and c.status='active'
  ) then raise exception 'DIAGNOSTIC_ACCESS_DENIED' using errcode='42501'; end if;
  if selected_experience not in ('beginner','sometimes','independent')
    or selected_format not in ('read','listen','practice')
    or cardinality(selected_goals) not between 1 and 6
    or jsonb_typeof(selected_confidence) <> 'object'
    or exists(select 1 from unnest(selected_goals) goal where not selected_confidence ? goal)
    or exists(select 1 from jsonb_object_keys(selected_confidence) key where not key=any(selected_goals))
  then raise exception 'INVALID_DIAGNOSTIC' using errcode='22023'; end if;
  for item in select value from jsonb_each(selected_confidence) loop
    if jsonb_typeof(item) <> 'number' or (item #>> '{}')::integer not between 1 and 5
    then raise exception 'INVALID_DIAGNOSTIC_CONFIDENCE' using errcode='22023'; end if;
  end loop;
  insert into public.learning_diagnostics(id,participant_id,experience_level,preferred_format,goals,category_confidence)
  values(requested_id,auth.uid(),selected_experience,selected_format,selected_goals,selected_confidence)
  on conflict(participant_id) do update set experience_level=excluded.experience_level,
    preferred_format=excluded.preferred_format,goals=excluded.goals,
    category_confidence=excluded.category_confidence,updated_at=now();
  return (select id from public.learning_diagnostics where participant_id=auth.uid());
end; $$;

create or replace function public.get_my_learning_diagnostic()
returns table(diagnostic_id uuid,experience_level text,preferred_format text,goals text[],category_confidence jsonb,updated_at timestamptz)
language sql stable security definer set search_path='' as $$
  select d.id,d.experience_level,d.preferred_format,d.goals,d.category_confidence,d.updated_at
  from public.learning_diagnostics d where d.participant_id=auth.uid();
$$;

create or replace function public.get_personalized_mission_recommendations(search_query text default '')
returns table(assignment_id uuid,title text,category text,recommendation_score integer,recommendation_reason text)
language sql stable security definer set search_path='' as $$
  with catalog as (select * from public.get_participant_mission_catalog()),
  completed as (
    select a.assignment_id,count(*) total from public.attempts a
    where a.participant_id=auth.uid() and a.status='completed' group by a.assignment_id
  ), diagnostic as (
    select d.* from public.learning_diagnostics d where d.participant_id=auth.uid()
  )
  select catalog.assignment_id,catalog.title,catalog.category,
    (case when completed.total is null then 40 else 0 end
      + case when catalog.is_required then 25 else 0 end
      + case when diagnostic.goals @> array[catalog.category] then 20 else 0 end
      + case when coalesce((diagnostic.category_confidence->>catalog.category)::integer,5)<=2 then 20 else 0 end
      + case when btrim(coalesce(search_query,''))='' then 10
        when lower(catalog.title||' '||catalog.summary||' '||catalog.category) operator(extensions.%) lower(search_query) then 60 else 0 end)::integer,
    case when btrim(coalesce(search_query,''))<>'' and lower(catalog.title||' '||catalog.summary||' '||catalog.category) operator(extensions.%) lower(search_query)
        then 'Combina com o que você quer aprender'
      when coalesce((diagnostic.category_confidence->>catalog.category)::integer,5)<=2
        then 'Você indicou pouca confiança nesta categoria'
      when diagnostic.goals @> array[catalog.category]
        then 'Esta categoria está entre seus objetivos'
      when completed.total is null then 'Uma habilidade nova para você'
      else 'Boa opção para praticar novamente' end
  from catalog left join completed using(assignment_id) left join diagnostic on true
  where btrim(coalesce(search_query,''))='' or lower(catalog.title||' '||catalog.summary||' '||catalog.category) operator(extensions.%) lower(search_query)
    or lower(catalog.title||' '||catalog.summary||' '||catalog.category) like '%'||lower(search_query)||'%'
  order by 4 desc,catalog.title limit 12;
$$;

create or replace function public.update_review_schedule_after_completion()
returns trigger language plpgsql security definer set search_path='' as $$
declare completions integer; support_used boolean; final_confidence smallint; chosen_interval smallint; chosen_reason text;
begin
  if new.status <> 'completed' or (tg_op='UPDATE' and old.status='completed') then return new; end if;
  select count(*) into completions from public.attempts a
    where a.participant_id=new.participant_id and a.assignment_id=new.assignment_id and a.status='completed';
  select exists(select 1 from public.attempt_events e where e.attempt_id=new.id and e.event_type in ('hint_requested','help_requested')) into support_used;
  select a.confidence_after into final_confidence from public.mission_self_assessments a where a.attempt_id=new.id order by a.completed_at desc limit 1;
  chosen_interval := case when support_used then 1 when coalesce(final_confidence,3)<=2 then 1 when completions=1 then 3 when completions=2 then 7 else 14 end;
  chosen_reason := case when support_used then 'needs_support' when coalesce(final_confidence,3)<=2 then 'low_confidence' when completions=1 then 'first_review' else 'continued_practice' end;
  insert into public.mission_review_schedules(participant_id,assignment_id,interval_days,completed_count,reason_code,last_completed_at,next_review_at)
  values(new.participant_id,new.assignment_id,chosen_interval,completions,chosen_reason,coalesce(new.completed_at,now()),coalesce(new.completed_at,now())+make_interval(days=>chosen_interval))
  on conflict(participant_id,assignment_id) do update set interval_days=excluded.interval_days,completed_count=excluded.completed_count,
    reason_code=excluded.reason_code,last_completed_at=excluded.last_completed_at,next_review_at=excluded.next_review_at,updated_at=now();
  return new;
end; $$;
create trigger attempts_schedule_review after insert or update of status on public.attempts
for each row execute function public.update_review_schedule_after_completion();

create or replace function public.get_my_review_plan()
returns table(assignment_id uuid,title text,next_review_at timestamptz,interval_days smallint,is_due boolean,review_reason text)
language sql stable security definer set search_path='' as $$
  select s.assignment_id,c.title,s.next_review_at,s.interval_days,s.next_review_at<=now(),
    case s.reason_code when 'needs_support' then 'Você usou apoio e uma revisão curta pode aumentar sua autonomia.'
      when 'low_confidence' then 'Sua confiança ficou baixa; vale praticar novamente com calma.'
      when 'first_review' then 'Esta é a primeira revisão para ajudar a lembrar os passos.'
      else 'Uma nova prática ajuda a manter esta habilidade.' end
  from public.mission_review_schedules s join public.get_participant_mission_catalog() c on c.assignment_id=s.assignment_id
  where s.participant_id=auth.uid() order by s.next_review_at limit 12;
$$;

create or replace function public.get_my_daily_mission()
returns table(assignment_id uuid,title text,category text,estimated_minutes integer,daily_reason text,is_review boolean)
language plpgsql security definer set search_path='' as $$
declare selected_assignment uuid; selected_reason text;
begin
  select d.assignment_id,d.reason_code into selected_assignment,selected_reason from public.daily_mission_choices d
    where d.participant_id=auth.uid() and d.choice_date=current_date;
  if selected_assignment is null then
    select r.assignment_id,'review_due' into selected_assignment,selected_reason from public.get_my_review_plan() r where r.is_due limit 1;
  end if;
  if selected_assignment is null then
    select r.assignment_id,case when c.is_required then 'required_new' else 'personalized' end
      into selected_assignment,selected_reason
    from public.get_personalized_mission_recommendations('') r
    join public.get_participant_mission_catalog() c on c.assignment_id=r.assignment_id
    where c.estimated_minutes <= 7
    order by r.recommendation_score desc,c.estimated_minutes,r.assignment_id limit 1;
  end if;
  if selected_assignment is null then return; end if;
  insert into public.daily_mission_choices(participant_id,choice_date,assignment_id,reason_code)
    values(auth.uid(),current_date,selected_assignment,coalesce(selected_reason,'daily_practice')) on conflict do nothing;
  return query select c.assignment_id,c.title,c.category,c.estimated_minutes::integer,
    case selected_reason when 'review_due' then 'Está na hora de revisar uma habilidade já praticada.'
      when 'required_new' then 'Esta atividade faz parte da trilha da sua turma.'
      else 'Escolhida para manter uma prática curta e constante.' end,
    selected_reason='review_due' from public.get_participant_mission_catalog() c where c.assignment_id=selected_assignment;
end; $$;

revoke all on function public.save_my_learning_diagnostic(uuid,text,text,text[],jsonb),public.get_my_learning_diagnostic(),public.get_my_review_plan(),public.get_my_daily_mission() from public;
grant execute on function public.save_my_learning_diagnostic(uuid,text,text,text[],jsonb),public.get_my_learning_diagnostic(),public.get_my_review_plan(),public.get_my_daily_mission() to authenticated;

commit;
