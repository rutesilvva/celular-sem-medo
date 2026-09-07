# Evidências de aprendizagem e modo de apresentação

## Jornada demonstrável

O produto conecta diagnóstico, recomendação explicável, simulação segura, evolução individual e impacto agregado. O modo de apresentação, habilitado somente fora de produção por `EXPO_PUBLIC_DEMO_MODE=true`, percorre essa narrativa com dados fictícios e previsíveis, sem consultar identidade ou banco.

## Evolução individual

`get_my_evolution_timeline` devolve somente as conclusões do aluno autenticado, com missão, data, confiança antes/depois, autonomia e quantidade de apoios. A tela **Meu progresso** apresenta até dez registros e gera PDF local temporário. Os arquivos são apagados após o compartilhamento.

## Recomendações explicáveis

As justificativas são calculadas no servidor a partir de objetivos, confiança, resposta ao cenário de golpe, novidade e busca. A interface exibe o motivo junto da missão. O papel ou uma justificativa arbitrária nunca é aceito do cliente.

## Pré e pós-oficina

`get_admin_pre_post_impact` compara confiança, primeira e última conclusão, pedidos de ajuda, reconhecimento de golpes e retenção. O acesso exige administrador global. Relatórios exportados contêm apenas totais e percentuais agregados, sem nomes, e-mails ou conteúdo produzido pelos alunos.

## Retenção e lembretes

Cada conclusão agenda uma verificação para três dias depois. O aluno responde se recordou o passo de segurança ou abre a missão para praticar novamente. Lembretes são notificações locais, habilitadas por ação explícita, com título da missão e rota interna; nenhum token, e-mail ou nome aparece na notificação.

## Testes

- `supabase/tests/competition_evidence_suite.sql`: autorização, agendamento, retenção, linha do tempo e agregação administrativa.
- `src/lib/review-notifications.test.ts`: permissão e agendamento local.
- `.maestro/participant-smoke.yaml`: missão completa e evolução.
- `.maestro/admin-smoke.yaml`: operação e painel de impacto.
- `.maestro/participant-diagnostic.yaml`: diagnóstico em etapas.
- `.maestro/competition-presentation.yaml`: roteiro controlado da banca.
