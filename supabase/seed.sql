begin;

insert into public.missions (
  id,
  slug,
  title,
  summary,
  category,
  difficulty,
  estimated_minutes,
  status
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'enviar-uma-foto',
    'Enviar uma foto',
    'Pratique como escolher uma imagem em uma conversa simulada.',
    'Mensagens',
    'easy',
    5,
    'active'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'conferir-um-pix',
    'Conferir um Pix',
    'Aprenda a revisar os dados de uma transferência em ambiente seguro.',
    'Segurança digital',
    'medium',
    7,
    'active'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'compartilhar-localizacao',
    'Compartilhar localização',
    'Pratique como escolher por quanto tempo uma localização simulada seria compartilhada.',
    'Mensagens',
    'medium',
    7,
    'active'
  )
on conflict (id) do update
set
  slug = excluded.slug,
  title = excluded.title,
  summary = excluded.summary,
  category = excluded.category,
  difficulty = excluded.difficulty,
  estimated_minutes = excluded.estimated_minutes,
  status = excluded.status;

insert into public.mission_versions (
  id,
  mission_id,
  version,
  status,
  title,
  description,
  learning_objective,
  content_language,
  changelog,
  published_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    1,
    'published',
    'Enviar uma foto',
    'Uma conversa inteiramente simulada ensina onde encontrar o anexo e como escolher uma foto.',
    'Localizar o botão de anexo e selecionar uma imagem sem executar um envio real.',
    'pt-BR',
    'Versão inicial do protótipo navegável.',
    '2026-08-23T00:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    1,
    'draft',
    'Conferir um Pix',
    'Uma tela simulada apresenta destinatário e valor fictícios para treino de conferência.',
    'Revisar destinatário e valor antes de confirmar ou cancelar uma transferência simulada.',
    'pt-BR',
    'Rascunho inicial; requer validação de conteúdo antes da publicação.',
    null
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    1,
    'draft',
    'Compartilhar localização',
    'Uma conversa simulada ensina a localizar a opção de localização e escolher uma duração.',
    'Encontrar a opção de localização e compreender que o compartilhamento possui duração.',
    'pt-BR',
    'Rascunho inicial; requer validação de conteúdo antes da publicação.',
    null
  )
on conflict (id) do update
set
  mission_id = excluded.mission_id,
  version = excluded.version,
  status = excluded.status,
  title = excluded.title,
  description = excluded.description,
  learning_objective = excluded.learning_objective,
  content_language = excluded.content_language,
  changelog = excluded.changelog,
  published_at = excluded.published_at;

insert into public.mission_steps (
  id,
  mission_version_id,
  position,
  step_type,
  title,
  instruction,
  audio_text,
  expected_action,
  options,
  hints
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    1,
    'instruction',
    'Abra a conversa de treino',
    'Observe a conversa simulada com Ana. Nada será enviado de verdade.',
    'Esta é uma conversa de treino. Observe a mensagem de Ana e siga para a parte de baixo da tela.',
    '{"action":"continue"}',
    '[]',
    '["Procure o botão Continuar abaixo da conversa."]'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    2,
    'tap_target',
    'Encontre o clipe',
    'Toque no desenho de clipe na parte de baixo da conversa.',
    'Procure o desenho que parece um clipe de papel, ao lado do campo de mensagem, e toque uma vez.',
    '{"action":"tap","target":"attachment_button"}',
    '[]',
    '["Olhe ao lado esquerdo do campo de mensagem.","O botão tem o desenho de um clipe de papel."]'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    3,
    'simulation',
    'Escolha a foto de treino',
    'Selecione a imagem de flores identificada como foto de treino.',
    'Agora escolha a imagem de flores. Ela existe somente dentro desta atividade.',
    '{"action":"select","target":"training_photo_flowers"}',
    '[{"id":"training_photo_flowers","label":"Flores"},{"id":"training_photo_family","label":"Família"}]',
    '["Escolha a imagem com flores."]'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000002',
    1,
    'instruction',
    'Leia os dados do treino',
    'Observe o nome e o valor fictícios apresentados na tela de Pix simulado.',
    'Leia com calma o nome da pessoa e o valor. Estes dados são fictícios.',
    '{"action":"continue"}',
    '[]',
    '["Comece pelo nome e depois confira o valor."]'
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000002',
    2,
    'multiple_choice',
    'Confira o destinatário',
    'Escolha o nome que aparece no resumo da transferência simulada.',
    'Compare o nome mostrado no resumo com as opções abaixo.',
    '{"action":"choose","option_id":"ana-treino"}',
    '[{"id":"ana-treino","label":"Ana Treino"},{"id":"nome-diferente","label":"Carlos Exemplo"}]',
    '["O nome correto está escrito no topo do resumo."]'
  ),
  (
    '30000000-0000-4000-8000-000000000006',
    '20000000-0000-4000-8000-000000000002',
    3,
    'confirmation',
    'Decida com segurança',
    'Os dados não conferem com o pedido do exercício. Escolha cancelar.',
    'Se algum dado estiver diferente do esperado, não confirme. Escolha cancelar.',
    '{"action":"choose","option_id":"cancel"}',
    '[{"id":"confirm","label":"Confirmar Pix de treino"},{"id":"cancel","label":"Cancelar com segurança"}]',
    '["Antes de confirmar, revise nome e valor.","Quando houver dúvida, cancelar é a escolha segura."]'
  ),
  (
    '30000000-0000-4000-8000-000000000007',
    '20000000-0000-4000-8000-000000000003',
    1,
    'tap_target',
    'Abra as opções da conversa',
    'Toque no clipe da conversa simulada para ver as opções.',
    'Na parte de baixo da conversa, toque no desenho de clipe.',
    '{"action":"tap","target":"attachment_button"}',
    '[]',
    '["O clipe fica ao lado do campo de mensagem."]'
  ),
  (
    '30000000-0000-4000-8000-000000000008',
    '20000000-0000-4000-8000-000000000003',
    2,
    'tap_target',
    'Escolha localização',
    'Toque em Localização na lista simulada de opções.',
    'Procure a opção com o desenho de um marcador de mapa.',
    '{"action":"tap","target":"location_option"}',
    '[]',
    '["O símbolo parece um pino usado em mapas."]'
  ),
  (
    '30000000-0000-4000-8000-000000000009',
    '20000000-0000-4000-8000-000000000003',
    3,
    'multiple_choice',
    'Escolha por quanto tempo',
    'Selecione quinze minutos para concluir a simulação.',
    'Uma localização compartilhada pode ter duração. Neste treino, escolha quinze minutos.',
    '{"action":"choose","option_id":"15-minutes"}',
    '[{"id":"15-minutes","label":"15 minutos"},{"id":"1-hour","label":"1 hora"},{"id":"8-hours","label":"8 horas"}]',
    '["Escolha a opção de menor duração para este exercício."]'
  )
on conflict (id) do update
set
  mission_version_id = excluded.mission_version_id,
  position = excluded.position,
  step_type = excluded.step_type,
  title = excluded.title,
  instruction = excluded.instruction,
  audio_text = excluded.audio_text,
  expected_action = excluded.expected_action,
  options = excluded.options,
  hints = excluded.hints;

commit;
