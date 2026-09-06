begin;

create table public.ai_mission_drafts (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  source_query text not null check(char_length(btrim(source_query)) between 3 and 160),
  title text not null check(char_length(btrim(title)) between 1 and 80),
  summary text not null check(char_length(btrim(summary)) between 1 and 240),
  difficulty public.mission_difficulty not null,
  estimated_minutes smallint not null check(estimated_minutes between 1 and 20),
  generated_content jsonb not null check(jsonb_typeof(generated_content)='array' and jsonb_array_length(generated_content) between 2 and 8),
  review_status text not null default 'pending' check(review_status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  published_mission_id uuid references public.missions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check((review_status='pending' and reviewed_at is null) or (review_status<>'pending' and reviewed_at is not null))
);
alter table public.ai_mission_drafts enable row level security;
create policy ai_mission_drafts_admin_read on public.ai_mission_drafts for select to authenticated using(public.is_global_admin());
revoke all on public.ai_mission_drafts from anon,authenticated;
grant select on public.ai_mission_drafts to authenticated;

create or replace function public.get_admin_ai_mission_drafts()
returns table(draft_id uuid,source_query text,title text,summary text,difficulty public.mission_difficulty,
  estimated_minutes smallint,generated_content jsonb,review_status text,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$ begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  return query select d.id,d.source_query,d.title,d.summary,d.difficulty,d.estimated_minutes,
    d.generated_content,d.review_status,d.created_at from public.ai_mission_drafts d order by d.created_at desc limit 100;
end $$;

create or replace function public.update_admin_ai_mission_draft(target_draft_id uuid,edited_title text,edited_summary text,edited_content jsonb)
returns boolean language plpgsql security definer set search_path='' as $$ begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  if char_length(btrim(edited_title)) not between 1 and 80 or char_length(btrim(edited_summary)) not between 1 and 240
    or jsonb_typeof(edited_content)<>'array' or jsonb_array_length(edited_content) not between 2 and 8
  then raise exception 'INVALID_AI_MISSION_DRAFT' using errcode='22023'; end if;
  update public.ai_mission_drafts set title=btrim(edited_title),summary=btrim(edited_summary),generated_content=edited_content,updated_at=now()
    where id=target_draft_id and review_status='pending';
  return found;
end $$;

create or replace function public.review_admin_ai_mission_draft(target_draft_id uuid,decision text)
returns uuid language plpgsql security definer set search_path='' as $$
declare draft public.ai_mission_drafts%rowtype; mission_id uuid; version_id uuid; step jsonb; step_position integer;
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  if decision not in ('approved','rejected') then raise exception 'INVALID_REVIEW_DECISION' using errcode='22023'; end if;
  select * into draft from public.ai_mission_drafts where id=target_draft_id and review_status='pending' for update;
  if not found then raise exception 'AI_MISSION_DRAFT_NOT_PENDING' using errcode='22023'; end if;
  if decision='rejected' then update public.ai_mission_drafts set review_status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=draft.id; return null; end if;
  mission_id:=gen_random_uuid(); version_id:=gen_random_uuid();
  insert into public.missions(id,slug,title,summary,category,difficulty,estimated_minutes,status,created_by)
    values(mission_id,'treino-ia-'||replace(draft.id::text,'-',''),draft.title,draft.summary,'Aprendizagem IA',draft.difficulty,draft.estimated_minutes,'active',draft.requested_by);
  insert into public.mission_versions(id,mission_id,version,status,title,description,learning_objective,content_language,changelog,published_at,created_by)
    values(version_id,mission_id,1,'published',draft.title,draft.summary,'Praticar a habilidade solicitada em ambiente seguro.','pt-BR','Conteúdo gerado por IA e aprovado por administrador.',now(),auth.uid());
  step_position:=0;
  for step in select value from jsonb_array_elements(draft.generated_content) loop
    step_position:=step_position+1;
    insert into public.mission_steps(mission_version_id,position,step_type,title,instruction,audio_text,safety_note,expected_action,options,hints)
    values(version_id,step_position,(step->>'type')::public.mission_step_type,step->>'title',step->>'instruction',step->>'audioText',step->>'safetyNote',
      coalesce(step->'expectedAction','{}'),coalesce(step->'options','[]'),coalesce(step->'hints','[]'));
  end loop;
  insert into public.class_mission_assignments(class_id,mission_version_id,assigned_by,assigned_by_role,status,is_required)
    select c.id,version_id,auth.uid(),'admin','active',false from public.classes c where c.status='active' on conflict do nothing;
  update public.ai_mission_drafts set review_status='approved',reviewed_by=auth.uid(),reviewed_at=now(),published_mission_id=mission_id,updated_at=now() where id=draft.id;
  return mission_id;
end $$;

revoke all on function public.get_admin_ai_mission_drafts(),public.update_admin_ai_mission_draft(uuid,text,text,jsonb),public.review_admin_ai_mission_draft(uuid,text) from public;
grant execute on function public.get_admin_ai_mission_drafts(),public.update_admin_ai_mission_draft(uuid,text,text,jsonb),public.review_admin_ai_mission_draft(uuid,text) to authenticated;

commit;
