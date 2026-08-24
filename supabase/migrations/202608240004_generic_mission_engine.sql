begin;

insert into public.missions (id, slug, title, summary, category, difficulty, estimated_minutes, status)
values
  ('10000000-0000-4000-8000-000000000004', 'pedir-um-uber', 'Pedir um Uber', 'Pratique como informar o destino e revisar uma corrida sem chamar um carro real.', 'Mobilidade', 'easy', 6, 'active'),
  ('10000000-0000-4000-8000-000000000005', 'baixar-um-aplicativo', 'Baixar um aplicativo', 'Aprenda a reconhecer o aplicativo correto e revisar permissões sem instalar nada.', 'Aplicativos', 'easy', 6, 'active')
on conflict (id) do update set
  title = excluded.title, summary = excluded.summary, category = excluded.category,
  difficulty = excluded.difficulty, estimated_minutes = excluded.estimated_minutes, status = excluded.status;

insert into public.mission_versions (
  id, mission_id, version, status, title, description, learning_objective,
  content_language, changelog, published_at
)
values
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 1, 'published', 'Pedir um Uber', 'Simulação segura de escolha de destino, categoria e revisão da corrida.', 'Revisar destino e preço antes de confirmar uma corrida simulada.', 'pt-BR', 'Primeira versão no motor genérico.', now()),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', 1, 'published', 'Baixar um aplicativo', 'Simulação segura de busca, conferência e revisão de permissões.', 'Identificar o aplicativo correto e avaliar permissões antes de uma instalação simulada.', 'pt-BR', 'Primeira versão no motor genérico.', now())
on conflict (id) do update set
  title = excluded.title, description = excluded.description,
  learning_objective = excluded.learning_objective, changelog = excluded.changelog;

insert into public.mission_steps (
  id, mission_version_id, position, step_type, title, instruction, audio_text,
  safety_note, expected_action, options, hints
)
values
  ('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000004', 1, 'instruction', 'Confira o ambiente de treino', 'Observe o mapa fictício e continue.', 'Este mapa é uma simulação. Nenhuma localização real será acessada.', 'O treino não usa GPS, não compartilha localização e não chama motoristas.', '{"action":"continue"}', '[]', '["Procure o botão Continuar."]'),
  ('30000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000004', 2, 'multiple_choice', 'Escolha o destino', 'Selecione Biblioteca Municipal como destino fictício.', 'Escolha Biblioteca Municipal na lista de destinos de treino.', 'Nenhum endereço real é enviado.', '{"action":"choose","option_id":"library"}', '[{"id":"library","label":"Biblioteca Municipal"},{"id":"unknown","label":"Endereço desconhecido"}]', '["Escolha o local conhecido indicado no exercício."]'),
  ('30000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000004', 3, 'confirmation', 'Revise a corrida', 'O destino e o preço fictício estão corretos. Confirme apenas a simulação.', 'Revise os dados e escolha Confirmar treino.', 'O botão confirma somente a atividade; nenhuma corrida ou cobrança será criada.', '{"action":"choose","option_id":"confirm-training"}', '[{"id":"confirm-training","label":"Confirmar treino"},{"id":"change","label":"Alterar destino"}]', '["Confira o selo Simulação segura antes de continuar."]'),
  ('30000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000005', 1, 'instruction', 'Abra a loja simulada', 'Observe a busca fictícia e continue.', 'Esta loja existe apenas no treino. Nenhum aplicativo será instalado.', 'O treino não abre a loja do aparelho nem inicia downloads.', '{"action":"continue"}', '[]', '["Procure o botão Continuar."]'),
  ('30000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000005', 2, 'multiple_choice', 'Escolha o aplicativo correto', 'Selecione o aplicativo com o nome e desenvolvedor indicados.', 'Compare o nome e o desenvolvedor antes de escolher.', 'As opções são fictícias e não abrem links externos.', '{"action":"choose","option_id":"official"}', '[{"id":"official","label":"Conecta Fácil — Empresa Exemplo"},{"id":"copy","label":"Conecta Grátis — Desenvolvedor desconhecido"}]', '["Confira primeiro o nome do desenvolvedor."]'),
  ('30000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000005', 3, 'confirmation', 'Revise as permissões', 'O aplicativo pede acesso aos contatos sem necessidade. Escolha cancelar.', 'Quando uma permissão não combina com a função do aplicativo, escolha cancelar.', 'Nenhuma permissão será solicitada e nada será instalado.', '{"action":"choose","option_id":"cancel"}', '[{"id":"install","label":"Instalar mesmo assim"},{"id":"cancel","label":"Cancelar com segurança"}]', '["Pergunte por que o aplicativo precisa de cada permissão."]')
on conflict (id) do update set
  title = excluded.title, instruction = excluded.instruction, audio_text = excluded.audio_text,
  safety_note = excluded.safety_note, expected_action = excluded.expected_action,
  options = excluded.options, hints = excluded.hints;

create or replace function public.start_or_resume_mission_attempt(target_assignment_id uuid, requested_attempt_id uuid)
returns table (
  attempt_id uuid, current_step_id uuid, attempt_status public.attempt_status,
  next_sequence_number integer, used_hint boolean, used_help boolean, mistake_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_assignment public.class_mission_assignments%rowtype;
  selected_attempt public.attempts%rowtype;
  first_step_id uuid;
begin
  select assignment.* into selected_assignment
  from public.class_mission_assignments assignment
  where assignment.id = target_assignment_id
    and public.has_active_class_role(assignment.class_id, 'participant')
    and public.is_assignment_available(assignment.id, assignment.class_id, assignment.mission_version_id);
  if not found then raise exception 'MISSION_ASSIGNMENT_NOT_AVAILABLE' using errcode = '42501'; end if;

  select attempt.* into selected_attempt from public.attempts attempt
  where attempt.participant_id = auth.uid() and attempt.assignment_id = target_assignment_id
    and attempt.status = 'in_progress' order by attempt.started_at desc limit 1;

  if not found then
    select step.id into strict first_step_id from public.mission_steps step
    where step.mission_version_id = selected_assignment.mission_version_id
    order by step.position limit 1;
    insert into public.attempts (
      id, participant_id, class_id, mission_version_id, assignment_id, current_step_id
    ) values (
      requested_attempt_id, auth.uid(), selected_assignment.class_id,
      selected_assignment.mission_version_id, selected_assignment.id, first_step_id
    ) returning * into selected_attempt;
  end if;

  return query select selected_attempt.id, selected_attempt.current_step_id,
    selected_attempt.status,
    coalesce((select max(event.sequence_number) + 1 from public.attempt_events event where event.attempt_id = selected_attempt.id), 1),
    exists (select 1 from public.attempt_events event where event.attempt_id = selected_attempt.id and event.event_type = 'hint_requested'),
    exists (select 1 from public.attempt_events event where event.attempt_id = selected_attempt.id and event.event_type = 'help_requested'),
    (select count(*)::integer from public.attempt_events event where event.attempt_id = selected_attempt.id and event.event_type = 'action_failed');
end;
$$;

create or replace function public.set_mission_attempt_progress(
  target_attempt_id uuid, target_step_id uuid, mark_completed boolean default false
)
returns public.attempt_status
language plpgsql
security definer
set search_path = ''
as $$
declare selected_attempt public.attempts%rowtype;
begin
  select * into selected_attempt from public.attempts attempt
  where attempt.id = target_attempt_id and attempt.participant_id = auth.uid()
  for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND' using errcode = '42501'; end if;
  if selected_attempt.status = 'completed' then return selected_attempt.status; end if;
  if target_step_id is not null and not exists (
    select 1 from public.mission_steps step where step.id = target_step_id
      and step.mission_version_id = selected_attempt.mission_version_id
  ) then raise exception 'INVALID_MISSION_STEP' using errcode = '22023'; end if;
  update public.attempts set current_step_id = target_step_id,
    status = case when mark_completed then 'completed'::public.attempt_status else 'in_progress'::public.attempt_status end
  where id = selected_attempt.id returning status into selected_attempt.status;
  return selected_attempt.status;
end;
$$;

revoke all on function public.start_or_resume_mission_attempt(uuid, uuid) from public;
revoke all on function public.set_mission_attempt_progress(uuid, uuid, boolean) from public;
grant execute on function public.start_or_resume_mission_attempt(uuid, uuid) to authenticated;
grant execute on function public.set_mission_attempt_progress(uuid, uuid, boolean) to authenticated;

commit;
