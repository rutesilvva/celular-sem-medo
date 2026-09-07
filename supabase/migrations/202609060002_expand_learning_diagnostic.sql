begin;

alter table public.learning_diagnostics
  add column barriers text[] not null default '{}',
  add column scam_response text,
  add constraint learning_diagnostics_barriers_allowed check (
    barriers <@ array['fear_wrong_tap','small_text','unclear_symbols','forget_steps','scam_fear','prefer_audio','unsure']::text[]
    and cardinality(barriers) between 0 and 7
  ),
  add constraint learning_diagnostics_scam_response_allowed check (
    scam_response in ('verify_known_contact','send_money','open_link','ask_help','unsure')
  );

create or replace function public.save_my_learning_diagnostic_v2(
  requested_id uuid, selected_experience text, selected_format text, selected_goals text[], selected_confidence jsonb,
  selected_barriers text[], selected_scam_response text
) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if cardinality(selected_barriers) not between 1 and 7
    or not selected_barriers <@ array['fear_wrong_tap','small_text','unclear_symbols','forget_steps','scam_fear','prefer_audio','unsure']::text[]
    or selected_scam_response not in ('verify_known_contact','send_money','open_link','ask_help','unsure')
  then raise exception 'INVALID_DIAGNOSTIC_ADDITIONAL_ANSWERS' using errcode='22023'; end if;
  result:=public.save_my_learning_diagnostic(requested_id,selected_experience,selected_format,selected_goals,selected_confidence);
  update public.learning_diagnostics set barriers=selected_barriers,scam_response=selected_scam_response,updated_at=now() where participant_id=auth.uid();
  return result;
end $$;

create or replace function public.get_my_learning_diagnostic_v2()
returns table(diagnostic_id uuid,experience_level text,preferred_format text,goals text[],category_confidence jsonb,barriers text[],scam_response text,updated_at timestamptz)
language sql stable security definer set search_path='' as $$
  select d.id,d.experience_level,d.preferred_format,d.goals,d.category_confidence,d.barriers,d.scam_response,d.updated_at
  from public.learning_diagnostics d where d.participant_id=auth.uid();
$$;

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
    case when btrim(coalesce(search_query,''))<>'' and lower(catalog.title||' '||catalog.summary||' '||catalog.category) operator(extensions.%) lower(search_query) then 'Combina com o que você quer aprender'
      when diagnostic.scam_response is distinct from 'verify_known_contact' and lower(catalog.category) like '%seguran%' then 'Ajuda a praticar uma decisão segura contra golpes'
      when coalesce((diagnostic.category_confidence->>catalog.category)::integer,5)<=2 then 'Você indicou pouca confiança nesta categoria'
      when diagnostic.goals @> array[catalog.category] then 'Esta categoria está entre seus objetivos'
      when completed.total is null then 'Uma habilidade nova para você' else 'Boa opção para praticar novamente' end
  from catalog left join completed using(assignment_id) left join diagnostic on true
  where btrim(coalesce(search_query,''))='' or lower(catalog.title||' '||catalog.summary||' '||catalog.category) operator(extensions.%) lower(search_query)
    or lower(catalog.title||' '||catalog.summary||' '||catalog.category) like '%'||lower(search_query)||'%'
  order by 4 desc,catalog.title limit 12;
$$;

revoke all on function public.save_my_learning_diagnostic_v2(uuid,text,text,text[],jsonb,text[],text),public.get_my_learning_diagnostic_v2() from public;
grant execute on function public.save_my_learning_diagnostic_v2(uuid,text,text,text[],jsonb,text[],text),public.get_my_learning_diagnostic_v2() to authenticated;

commit;
