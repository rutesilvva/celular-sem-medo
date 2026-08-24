# Métricas persistidas de progresso

As telas de participante e monitor usam projeções do mesmo conjunto de
`attempts` e `attempt_events`. O aplicativo não calcula nem mantém percentuais
de aprendizagem no `AppContext`.

## Fórmulas

- **Conclusão individual:** quantidade de atribuições disponíveis com ao menos
  uma tentativa concluída. Repetições não aumentam nem reduzem esse total.
- **Progresso individual:** `atribuições distintas concluídas / atribuições
  disponíveis × 100`, limitado a 100%.
- **Conclusão da turma:** pares distintos `(participante, atribuição)` concluídos
  no período divididos por `participantes ativos × atribuições disponíveis`.
- **Autonomia:** tentativas concluídas sem `hint_requested` nem `help_requested`
  divididas por todas as tentativas concluídas.
- **Uso de áudio:** tentativas com `audio_started` ou `audio_completed` divididas
  por todas as tentativas iniciadas.
- **Dificuldade:** tentativas com `action_failed`, `hint_requested` ou
  `help_requested` divididas por todas as tentativas iniciadas.
- **Sequência:** dias UTC consecutivos com ao menos uma conclusão, terminando
  hoje ou ontem. Mais de uma conclusão no mesmo dia conta uma vez.

As métricas de período aceitam de 1 a 365 dias. Turmas sem atividade retornam
zeros, nunca `null`, divisão por zero ou percentuais demonstrativos.

## Consistência e acesso

Eventos são append-only e usam UUID determinístico por tentativa e sequência.
O reenvio da mesma operação retorna o evento existente; um payload divergente é
rejeitado. O participante acessa somente suas projeções, enquanto RPCs de turma
exigem vínculo ativo de monitor. A conquista mais recente deriva da tentativa
concluída persistida e informa `autonomous`, `with_hint` ou `with_help`.
