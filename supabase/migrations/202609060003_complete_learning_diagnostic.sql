begin;

alter table public.learning_diagnostics
  add column independent_actions text[] not null default '{}',
  add column support_response text,
  add constraint learning_diagnostics_independent_actions_allowed check (
    independent_actions <@ array['whatsapp','install_apps','photos','pix','gov_br','youtube','calls','none']::text[]
    and cardinality(independent_actions) between 0 and 8
  ),
  add constraint learning_diagnostics_support_response_allowed check (
    support_response in ('try_again','ask_help','give_up','avoid_task','unsure')
  );

create or replace function public.save_my_learning_diagnostic_v3(
  requested_id uuid, selected_experience text, selected_format text, selected_goals text[], selected_confidence jsonb,
  selected_barriers text[], selected_scam_response text, selected_independent_actions text[], selected_support_response text
) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if cardinality(selected_independent_actions) not between 1 and 8
    or not selected_independent_actions <@ array['whatsapp','install_apps','photos','pix','gov_br','youtube','calls','none']::text[]
    or ('none'=any(selected_independent_actions) and cardinality(selected_independent_actions)>1)
    or selected_support_response not in ('try_again','ask_help','give_up','avoid_task','unsure')
  then raise exception 'INVALID_DIAGNOSTIC_BEHAVIOR_ANSWERS' using errcode='22023'; end if;
  result:=public.save_my_learning_diagnostic_v2(requested_id,selected_experience,selected_format,selected_goals,selected_confidence,selected_barriers,selected_scam_response);
  update public.learning_diagnostics set independent_actions=selected_independent_actions,support_response=selected_support_response,updated_at=now() where participant_id=auth.uid();
  return result;
end $$;

create or replace function public.get_my_learning_diagnostic_v3()
returns table(diagnostic_id uuid,experience_level text,preferred_format text,goals text[],category_confidence jsonb,barriers text[],scam_response text,independent_actions text[],support_response text,updated_at timestamptz)
language sql stable security definer set search_path='' as $$
  select d.id,d.experience_level,d.preferred_format,d.goals,d.category_confidence,d.barriers,d.scam_response,d.independent_actions,d.support_response,d.updated_at
  from public.learning_diagnostics d where d.participant_id=auth.uid();
$$;

revoke all on function public.save_my_learning_diagnostic_v3(uuid,text,text,text[],jsonb,text[],text,text[],text),public.get_my_learning_diagnostic_v3() from public;
grant execute on function public.save_my_learning_diagnostic_v3(uuid,text,text,text[],jsonb,text[],text,text[],text),public.get_my_learning_diagnostic_v3() to authenticated;

commit;
