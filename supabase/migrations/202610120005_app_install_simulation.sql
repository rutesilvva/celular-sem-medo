begin;

update public.mission_versions
set
  description = 'Simulação segura de busca, conferência da página, instalação visual e abertura de um aplicativo fictício.',
  learning_objective = 'Buscar o aplicativo correto, conferir sua página e reconhecer as etapas de uma instalação sem baixar arquivos reais.',
  changelog = 'Fluxo ampliado com busca digitável, detalhes, progresso de instalação e estado instalado.'
where id = '20000000-0000-4000-8000-000000000005';

update public.mission_steps
set
  title = 'Instale no ambiente de treino',
  instruction = 'Confira os dados e toque em Instalar. Aguarde o progresso fictício e depois toque em Abrir.',
  audio_text = 'Toque em instalar, acompanhe o progresso de treinamento e, quando terminar, toque em abrir.',
  safety_note = 'Nenhum arquivo será baixado, nenhuma permissão será solicitada e nada será instalado no aparelho.',
  expected_action = '{"action":"choose","option_id":"install-training"}'::jsonb,
  options = '[{"id":"install-training","label":"Instalar e abrir no treino"}]'::jsonb,
  hints = '["O botão Instalar inicia apenas uma animação.","Quando aparecer Instalado, toque em Abrir."]'::jsonb
where id = '30000000-0000-4000-8000-000000000015';

commit;
