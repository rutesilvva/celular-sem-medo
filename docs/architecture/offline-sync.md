# Retomada e sincronização offline

## Escopo

Depois de uma leitura online, catálogo e conteúdo publicado são armazenados localmente por usuário. Identidade e preferências ficam no armazenamento seguro; conteúdo público da missão, estado da tentativa e eventos sem payload pessoal ficam no AsyncStorage. Avaliações de confiança iniciadas ou concluídas offline entram em uma fila vinculada à tentativa e são enviadas após a tentativa receber seu ID remoto. Pedidos de ajuda continuam indisponíveis sem rede, pois exigem atendimento humano em tempo real.

## Fila e idempotência

Cada tentativa usa um UUID local solicitado também ao backend. Cada operação recebe UUID próprio e é mantida até confirmação. Na sincronização, a sequência confirmada pelo servidor produz o ID determinístico do evento. Se o envio terminar e a atualização do passo falhar, a repetição do mesmo evento é aceita de modo idempotente e a atualização é tentada novamente.

Falhas usam backoff exponencial de 1, 2, 4 segundos até o limite de 30 segundos. A interface mostra modo offline, quantidade pendente, erro, retry e confirmação final.

## Conflitos

Se outro aparelho já possuir uma tentativa ativa para a mesma missão, `start_or_resume_mission_attempt` devolve a tentativa canônica do servidor. O cliente passa a usar esse ID e a próxima sequência fornecida pelo servidor, reaplicando em ordem as operações locais ainda não confirmadas. Conclusões são monotônicas: repetir ou sincronizar nunca remove uma conquista.

## Isolamento de conta

Todas as chaves incluem o UUID do proprietário, cada registro repete `ownerId` e o sincronizador ignora qualquer fila cujo proprietário difira da sessão. Logout remove a identidade criptografada, mas preserva filas sob a chave anterior; uma conta diferente não consegue lê-las nem enviá-las.

## Recuperação e retenção local

A tela **Perfil → Atividades salvas no aparelho** mostra tentativas, passo restaurável, horário, eventos pendentes e ações de sincronização individual ou total. Registros inválidos ou JSON corrompido são descartados sem bloquear as demais filas. Tentativas sincronizadas sem pendências expiram após 90 dias; uma tentativa com qualquer operação pendente nunca é removida automaticamente.
