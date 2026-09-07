begin;

create table public.learning_diagnostic_history (
  id uuid primary key default gen_random_uuid(),
  diagnostic_id uuid not null references public.learning_diagnostics(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  revision integer not null check (revision > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot)='object'),
  changed_at timestamptz not null default now(),
  unique(diagnostic_id,revision)
);
create index learning_diagnostic_history_participant_idx on public.learning_diagnostic_history(participant_id,changed_at desc);
alter table public.learning_diagnostic_history enable row level security;
create policy diagnostic_history_select_own_or_admin on public.learning_diagnostic_history for select to authenticated
using(participant_id=auth.uid() or public.is_global_admin());
revoke all on public.learning_diagnostic_history from anon,authenticated;
grant select on public.learning_diagnostic_history to authenticated;

create or replace function public.save_my_learning_diagnostic_v3(
  requested_id uuid, selected_experience text, selected_format text, selected_goals text[], selected_confidence jsonb,
  selected_barriers text[], selected_scam_response text, selected_independent_actions text[], selected_support_response text
) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; next_revision integer;
begin
  if cardinality(selected_independent_actions) not between 1 and 8
    or not selected_independent_actions <@ array['whatsapp','install_apps','photos','pix','gov_br','youtube','calls','none']::text[]
    or ('none'=any(selected_independent_actions) and cardinality(selected_independent_actions)>1)
    or selected_support_response not in ('try_again','ask_help','give_up','avoid_task','unsure')
  then raise exception 'INVALID_DIAGNOSTIC_BEHAVIOR_ANSWERS' using errcode='22023'; end if;
  result:=public.save_my_learning_diagnostic_v2(requested_id,selected_experience,selected_format,selected_goals,selected_confidence,selected_barriers,selected_scam_response);
  update public.learning_diagnostics set independent_actions=selected_independent_actions,support_response=selected_support_response,updated_at=now() where participant_id=auth.uid();
  select coalesce(max(h.revision),0)+1 into next_revision from public.learning_diagnostic_history h where h.diagnostic_id=result;
  insert into public.learning_diagnostic_history(diagnostic_id,participant_id,revision,snapshot)
  values(result,auth.uid(),next_revision,jsonb_build_object(
    'experience_level',selected_experience,'preferred_format',selected_format,'goals',selected_goals,
    'category_confidence',selected_confidence,'barriers',selected_barriers,'scam_response',selected_scam_response,
    'independent_actions',selected_independent_actions,'support_response',selected_support_response
  ));
  return result;
end $$;

commit;
