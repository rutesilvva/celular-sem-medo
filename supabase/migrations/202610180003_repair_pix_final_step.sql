begin;

update public.mission_steps
set title = 'Confira o valor',
    instruction = 'Compare o valor digitado com o valor mostrado no resumo.',
    audio_text = 'Você digitou vinte reais e o resumo mostra vinte reais. Escolha a opção que informa que o valor confere.',
    expected_action = '{"action":"choose","option_id":"same-value"}'::jsonb,
    options = '[{"id":"same-value","label":"O valor continua R$ 20,00 e está correto"},{"id":"different-value","label":"O valor mudou e está diferente"}]'::jsonb,
    hints = '["Compare os números: R$ 20,00 e R$ 20,00 são iguais."]'::jsonb
where id = '30000000-0000-4000-8000-000000000006';

insert into public.mission_steps(
  id, mission_version_id, position, step_type, title, instruction, audio_text,
  safety_note, expected_action, options, hints
)
values (
  '30000000-0000-4000-8000-000000000029',
  '20000000-0000-4000-8000-000000000002',
  4,
  'confirmation',
  'Confirme somente depois de revisar',
  'Nome, banco e valor estão corretos. Escolha confirmar o Pix simulado.',
  'Os dados conferem. Agora escolha confirmar o Pix simulado.',
  'Confirmar conclui somente o treino. Nenhum Pix será realizado.',
  '{"action":"choose","option_id":"confirm"}',
  '[{"id":"confirm","label":"Confirmar o Pix simulado"},{"id":"cancel","label":"Voltar e revisar novamente"}]',
  '["Confirme somente quando nome, banco e valor estiverem corretos."]'
)
on conflict (id) do update set
  mission_version_id = excluded.mission_version_id,
  position = excluded.position,
  step_type = excluded.step_type,
  title = excluded.title,
  instruction = excluded.instruction,
  audio_text = excluded.audio_text,
  safety_note = excluded.safety_note,
  expected_action = excluded.expected_action,
  options = excluded.options,
  hints = excluded.hints;

commit;
