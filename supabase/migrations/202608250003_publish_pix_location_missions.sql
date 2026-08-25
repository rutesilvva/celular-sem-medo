begin;

insert into public.missions (id, slug, title, summary, category, difficulty, estimated_minutes, status)
values
  ('10000000-0000-4000-8000-000000000002', 'conferir-um-pix', 'Conferir um Pix', 'Aprenda a revisar nome e valor de uma transferência fictícia antes de decidir com segurança.', 'Segurança digital', 'medium', 7, 'active'),
  ('10000000-0000-4000-8000-000000000003', 'compartilhar-localizacao', 'Compartilhar localização', 'Pratique como escolher destinatário e duração usando uma localização totalmente fictícia.', 'Mensagens', 'medium', 7, 'active')
on conflict (id) do update set
  slug = excluded.slug, title = excluded.title, summary = excluded.summary,
  category = excluded.category, difficulty = excluded.difficulty,
  estimated_minutes = excluded.estimated_minutes, status = excluded.status;

insert into public.mission_versions (
  id, mission_id, version, status, title, description, learning_objective,
  content_language, changelog, published_at
)
values
  (
    '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
    1, 'published', 'Conferir um Pix',
    'Uma tela simulada apresenta destinatário e valor fictícios para treino de conferência e cancelamento seguro.',
    'Revisar destinatário e valor antes de confirmar ou cancelar uma transferência simulada.',
    'pt-BR', 'Jornada completa no motor seguro, sem dados bancários reais.', now()
  ),
  (
    '20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003',
    1, 'published', 'Compartilhar localização',
    'Uma conversa simulada ensina a conferir destinatário e escolher por quanto tempo uma posição fictícia seria compartilhada.',
    'Encontrar a opção de localização, conferir o destinatário e escolher uma duração limitada.',
    'pt-BR', 'Jornada completa no motor seguro, sem GPS ou posição real.', now()
  )
on conflict (id) do update set
  status = excluded.status, title = excluded.title, description = excluded.description,
  learning_objective = excluded.learning_objective, changelog = excluded.changelog,
  published_at = coalesce(public.mission_versions.published_at, excluded.published_at);

insert into public.mission_steps (
  id, mission_version_id, position, step_type, title, instruction, audio_text,
  safety_note, expected_action, options, hints
)
values
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 1, 'instruction', 'Leia os dados do treino', 'Observe o nome Ana Treino e o valor fictício de R$ 25 na tela de Pix simulado.', 'Leia com calma o nome Ana Treino e o valor de vinte e cinco reais. Estes dados existem somente no treino.', 'Não informe chave Pix, banco, senha, saldo, CPF ou qualquer dado real.', '{"action":"continue"}', '[]', '["Comece pelo nome e depois confira o valor."]'),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 2, 'multiple_choice', 'Confira o destinatário', 'Escolha o nome mostrado no resumo fictício.', 'Compare o nome do resumo com as opções e escolha Ana Treino.', 'Os nomes são fictícios e nenhuma conta bancária será consultada.', '{"action":"choose","option_id":"ana-treino"}', '[{"id":"ana-treino","label":"Ana Treino"},{"id":"nome-diferente","label":"Carlos Exemplo"}]', '["O nome correto está escrito no topo do resumo."]'),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 3, 'multiple_choice', 'Confira o valor', 'O pedido do exercício era de R$ 20, mas o resumo mostra R$ 25. Identifique a diferença.', 'Compare vinte reais com vinte e cinco reais e escolha a opção que indica valor diferente.', 'Nenhum saldo, banco ou aplicativo financeiro real é acessado.', '{"action":"choose","option_id":"different-value"}', '[{"id":"same-value","label":"O valor está correto"},{"id":"different-value","label":"O valor está diferente"}]', '["Compare o valor pedido, vinte reais, com o valor exibido, vinte e cinco reais."]'),
  ('30000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000002', 4, 'confirmation', 'Decida com segurança', 'Como o valor está diferente, escolha cancelar a operação de treino.', 'Quando nome ou valor não conferem, não confirme. Escolha cancelar com segurança.', 'Cancelar conclui apenas a missão; nenhum Pix ou movimentação será realizado.', '{"action":"choose","option_id":"cancel"}', '[{"id":"confirm","label":"Confirmar Pix de treino"},{"id":"cancel","label":"Cancelar com segurança"}]', '["Antes de confirmar um Pix real, revise nome e valor.","Quando houver dúvida, cancele e fale com alguém de confiança."]'),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000003', 1, 'tap_target', 'Abra as opções da conversa', 'Toque no clipe da conversa simulada para ver opções fictícias.', 'Na parte de baixo da conversa de treino, toque no desenho de clipe.', 'O treino não abre aplicativos de mensagem, contatos ou arquivos reais.', '{"action":"tap","target":"attachment_button"}', '[]', '["O clipe fica ao lado do campo de mensagem."]'),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000003', 2, 'tap_target', 'Escolha localização', 'Toque em Localização na lista simulada.', 'Procure a opção com o desenho de um marcador de mapa.', 'Nenhuma permissão será solicitada e o GPS não será acessado.', '{"action":"tap","target":"location_option"}', '[]', '["O símbolo parece um pino usado em mapas."]'),
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000003', 3, 'multiple_choice', 'Confira quem receberia', 'A conversa de treino é com Ana. Escolha Ana como destinatária fictícia.', 'Antes de compartilhar uma localização, confira com quem você está conversando.', 'Nenhum contato real será lido e nenhuma pessoa receberá uma mensagem.', '{"action":"choose","option_id":"ana-training"}', '[{"id":"ana-training","label":"Ana — conversa de treino"},{"id":"unknown-person","label":"Pessoa desconhecida"}]', '["Confira o nome exibido no alto da conversa."]'),
  ('30000000-0000-4000-8000-000000000021', '20000000-0000-4000-8000-000000000003', 4, 'multiple_choice', 'Escolha por quanto tempo', 'Selecione quinze minutos para concluir a simulação com a menor duração.', 'Neste treino, escolha compartilhar a posição fictícia por quinze minutos.', 'Nada será compartilhado, o GPS continuará desligado e nenhuma posição real será armazenada.', '{"action":"choose","option_id":"15-minutes"}', '[{"id":"15-minutes","label":"15 minutos"},{"id":"1-hour","label":"1 hora"},{"id":"8-hours","label":"8 horas"}]', '["Prefira o menor tempo suficiente e compartilhe apenas com pessoas de confiança."]')
on conflict (id) do update set
  position = excluded.position, step_type = excluded.step_type, title = excluded.title,
  instruction = excluded.instruction, audio_text = excluded.audio_text,
  safety_note = excluded.safety_note, expected_action = excluded.expected_action,
  options = excluded.options, hints = excluded.hints;

commit;
