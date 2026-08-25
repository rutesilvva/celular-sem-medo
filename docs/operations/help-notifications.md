# Notificações de pedidos de ajuda

O aplicativo sempre oferece notificações **in-app** consultando o backend. Push é
opcional e só solicita permissão quando a pessoa toca em “Ativar avisos”. O texto
na tela bloqueada é genérico e não contém nome, missão, passo ou orientação.

Para ativar push em staging/production:

1. configure o `projectId` do EAS (issue 18) e gere um development build;
2. publique `dispatch-help-push` e defina `HELP_PUSH_DISPATCH_SECRET`;
3. invoque a função por scheduler autenticado em intervalos curtos;
4. monitore `push_outbox` sem registrar tokens ou conteúdo de pedidos.

Tokens com resposta `DeviceNotRegistered` são removidos. Falhas permanecem na
outbox para nova tentativa. O deep link contém apenas o UUID do pedido; a RPC e a
RLS validam novamente turma e papel antes de retornar qualquer dado.
