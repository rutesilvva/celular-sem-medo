# Métricas do monitor

Todas as métricas são calculadas no PostgreSQL sobre tentativas e eventos da turma
autorizada. Os períodos aceitos são 7, 30 e 90 dias e usam `started_at` em UTC.

- **Conclusão do participante:** missões distintas concluídas ÷ atribuições ativas e publicadas.
- **Conclusão da turma:** pares distintos participante–missão concluídos ÷ participantes ativos × atribuições ativas.
- **Autonomia:** tentativas concluídas sem `hint_requested` nem `help_requested` ÷ tentativas concluídas.
- **Dificuldade/uso de ajuda:** tentativas com `action_failed`, `hint_requested` ou `help_requested` ÷ tentativas iniciadas.
- **Áudio:** tentativas com `audio_started` ou `audio_completed` ÷ tentativas iniciadas.
- **Evolução:** tentativas iniciadas e concluídas por dia UTC dentro do período selecionado.
- **Nota média:** média de `attempts.score` apenas entre tentativas concluídas; sem nota real, o valor é zero.

Percentuais usam arredondamento para o inteiro mais próximo e retornam zero quando o
denominador é zero. A interface apresenta estado vazio quando não há atividade, para
que zero não seja interpretado como uma métrica observada. Repetições permanecem no
histórico, mas conclusão conta cada participante–missão uma única vez.

Busca, filtro, ordenação e paginação acontecem no servidor. O limite máximo é 100
itens por página. Todas as funções verificam vínculo ativo de monitor antes de ler a
turma; identificadores de participantes fora desse escopo retornam conjunto vazio.
