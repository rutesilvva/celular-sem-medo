begin;

insert into public.missions (id, slug, title, summary, category, difficulty, estimated_minutes, status)
values (
  '10000000-0000-4000-8000-000000000006', 'simular-compra-shopee',
  'Simular uma compra na Shopee',
  'Aprenda a pesquisar um produto, conferir o anúncio e revisar o pedido sem comprar ou pagar de verdade.',
  'Compras online', 'easy', 8, 'active'
)
on conflict (id) do update set
  title = excluded.title, summary = excluded.summary, category = excluded.category,
  difficulty = excluded.difficulty, estimated_minutes = excluded.estimated_minutes,
  status = excluded.status;

insert into public.mission_versions (
  id, mission_id, version, status, title, description, learning_objective,
  content_language, changelog, published_at
)
values (
  '20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006',
  1, 'published', 'Simular uma compra na Shopee',
  'Simulação segura de pesquisa, conferência do anúncio, carrinho e revisão final de uma compra.',
  'Reconhecer informações importantes de um anúncio e revisar preço, frete e endereço antes de uma compra online.',
  'pt-BR', 'Primeira versão segura da simulação de compra.', now()
)
on conflict (id) do update set
  title = excluded.title, description = excluded.description,
  learning_objective = excluded.learning_objective, changelog = excluded.changelog;

insert into public.mission_steps (
  id, mission_version_id, position, step_type, title, instruction, audio_text,
  safety_note, expected_action, options, hints
)
values
  (
    '30000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000006',
    1, 'instruction', 'Abra a loja de treino',
    'Observe a página fictícia da Shopee e continue para pesquisar um produto.',
    'Esta é uma loja de treino. Toque em continuar para iniciar a pesquisa simulada.',
    'A Shopee real não será aberta e nenhum dado da sua conta será acessado.',
    '{"action":"continue"}', '[]', '["Procure o botão Continuar abaixo da simulação."]'
  ),
  (
    '30000000-0000-4000-8000-000000000017', '20000000-0000-4000-8000-000000000006',
    2, 'multiple_choice', 'Escolha o anúncio mais seguro',
    'Compare as opções e selecione o anúncio com avaliações, descrição clara e venda dentro da plataforma.',
    'Confira avaliações, descrição e se o pagamento permanece dentro da plataforma.',
    'Os anúncios são fictícios; nenhum vendedor será contatado e nenhum link externo será aberto.',
    '{"action":"choose","option_id":"safe-listing"}',
    '[{"id":"safe-listing","label":"Loja bem avaliada, descrição completa e pagamento no app"},{"id":"unsafe-listing","label":"Preço muito baixo e pedido de pagamento por mensagem"}]',
    '["Nunca aceite pagar por mensagem ou fora da plataforma.","Observe as avaliações e a descrição do produto."]'
  ),
  (
    '30000000-0000-4000-8000-000000000018', '20000000-0000-4000-8000-000000000006',
    3, 'multiple_choice', 'Revise o carrinho',
    'O produto custa R$ 30 e o frete R$ 8. Selecione o total correto antes de continuar.',
    'Some o preço do produto e o frete antes de revisar o pedido.',
    'Os valores são apenas exemplos; nada será adicionado a um carrinho real.',
    '{"action":"choose","option_id":"total-38"}',
    '[{"id":"total-30","label":"Total de R$ 30"},{"id":"total-38","label":"Total de R$ 38"},{"id":"total-80","label":"Total de R$ 80"}]',
    '["O total inclui o produto e também o frete."]'
  ),
  (
    '30000000-0000-4000-8000-000000000019', '20000000-0000-4000-8000-000000000006',
    4, 'confirmation', 'Faça a conferência final',
    'Preço, frete e endereço fictício estão corretos. Finalize somente o treino.',
    'Revise os dados e escolha finalizar simulação. Não escolha pagar agora.',
    'Nenhuma compra, cobrança, Pix, cartão ou entrega será criada.',
    '{"action":"choose","option_id":"finish-training"}',
    '[{"id":"pay-now","label":"Pagar agora"},{"id":"finish-training","label":"Finalizar simulação"}]',
    '["Em uma compra real, confira produto, quantidade, frete, endereço e total antes de pagar."]'
  )
on conflict (id) do update set
  title = excluded.title, instruction = excluded.instruction, audio_text = excluded.audio_text,
  safety_note = excluded.safety_note, expected_action = excluded.expected_action,
  options = excluded.options, hints = excluded.hints;

commit;
