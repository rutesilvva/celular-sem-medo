# Conteúdo assistido por IA, convites QR e pacotes offline

## Fluxo editorial da IA

A Edge Function `generate-mission` autentica o aluno, aplica cota, valida tema e resposta e mantém a chave do Gemini somente nos secrets do Supabase. Uma geração válida continua disponível imediatamente como treino temporário e também cria um rascunho editorial. O rascunho nunca entra no catálogo automaticamente.

Administradores globais acessam a fila em **Missões**, revisam título, resumo, instrução, dicas e aviso de segurança de cada passo e então salvam, rejeitam ou publicam. A publicação cria `mission`, versão imutável publicada, passos e atribuições para turmas ativas. RLS oculta toda a fila dos alunos e as RPCs exigem administrador global.

## Convite por QR Code

O QR contém apenas um deep link `celularsemmedo://invite?token=...`. O token aleatório é vinculado ao e-mail Google informado, persiste no banco somente como SHA-256, expira em até sete dias e tem uso único. O aparelho guarda temporariamente o token em armazenamento seguro. Após o OAuth, o convite é consumido antes de resolver os papéis; uma conta Google diferente é recusada e desconectada.

O QR pode ser lido pela câmera do sistema, portanto o aplicativo não solicita permissão de câmera. O Celular Sem Medo precisa estar instalado e o scheme `celularsemmedo` precisa estar presente na build.

## Pacote offline

Em **Detalhes da missão**, o aluno pode baixar explicitamente a versão publicada e todos os seus passos. A lista em **Atividades offline** mostra data, quantidade de passos, abertura e remoção. O armazenamento é separado por usuário. Tentativas e eventos continuam na fila idempotente existente e sincronizam quando a rede retorna.

O download atual contém dados textuais, opções, dicas e referências de apresentação empacotadas na build. Se missões futuras usarem arquivos remotos, esses arquivos deverão entrar no manifesto do pacote antes de serem anunciados como disponíveis offline.
