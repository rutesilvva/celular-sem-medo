# Motor seguro de missões

O executor interpreta `mission_steps` e não conhece jornadas específicas. Cada
passo informa instrução, ação esperada, opções, dicas, áudio e aviso de segurança.
O mesmo componente executa Enviar uma foto, Pedir um Uber, Baixar um aplicativo,
Simular uma compra na Shopee e novas definições compatíveis.

## Garantia de ausência de efeitos reais

O motor aceita apenas quatro ações internas: `continue`, `tap`, `choose` e
`select`. Elas são comparadas como dados pelo executor e gravadas como eventos.
Não existe adaptador para câmera, biblioteca de fotos, mensagens, GPS, mapas,
lojas de aplicativos, pagamentos, deep links externos ou APIs de transporte.
Consequentemente, uma definição recebida do backend não consegue solicitar
permissões nem disparar efeitos do aparelho. Novos tipos de ação devem passar por
revisão de segurança e por testes antes de entrarem nessa lista fechada.

## Estado e idempotência

- O backend cria ou retoma no máximo uma tentativa `in_progress` por pessoa e
  atribuição.
- O passo atual fica em `attempts.current_step_id`, portanto voltar, fechar ou
  atualizar o aplicativo restaura o mesmo ponto.
- Eventos usam um UUID determinístico por tentativa e número de sequência. A
  mesma operação repetida não duplica o evento.
- Acertos, erros, dicas, áudio e ajuda usam tipos distintos. Uma conclusão com
  ajuda contém `help_requested`; uma autônoma não contém eventos de dica/ajuda.
- Repetir uma missão concluída cria outra tentativa. A tentativa concluída e sua
  conquista anterior permanecem imutáveis.

O progresso só avança depois que o evento foi aceito pelo servidor. Se a rede
falhar, o passo permanece na tela e pode ser reenviado com a mesma identidade.
