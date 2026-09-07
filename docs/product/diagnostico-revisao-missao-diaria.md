# Diagnóstico, revisão espaçada e missão diária

## Objetivo

Os três recursos formam uma trilha simples e explicável: o diagnóstico registra como o aluno prefere aprender; as recomendações priorizam seus objetivos e áreas de menor confiança; após uma conclusão, o sistema agenda revisões e escolhe uma missão curta por dia.

## Diagnóstico inicial

O aluno responde sete perguntas principais: nível de experiência, formato preferido, ações que já realiza sozinho, dificuldades, reação habitual quando precisa de apoio, objetivos e um cenário prático sobre uma mensagem urgente que pede dinheiro. Para cada categoria escolhida, também informa a confiança de 1 a 5. Não é uma avaliação clínica nem uma prova.

As respostas estruturadas têm efeitos explicáveis:

- dificuldade de leitura ativa texto maior;
- preferência por áudio ativa a leitura automática;
- dificuldade para lembrar a ordem ativa a repetição de instruções;
- uma resposta insegura ou incerta ao cenário prioriza missões de segurança digital.

A interface salva primeiro no aparelho e sincroniza quando houver conexão. Apenas o próprio aluno e administradores globais podem ler o registro; escrita direta nas tabelas é bloqueada por RLS e a validação ocorre na RPC versionada.

O preenchimento é dividido em sete etapas, com indicador de progresso e foco anunciado ao leitor de tela. Respostas únicas usam controles de rádio; respostas múltiplas usam caixas de seleção, com áreas de toque ampliadas. Cada alteração fica em um rascunho local separado por usuário, permitindo fechar o aplicativo e continuar depois.

Antes de salvar, a interface apresenta um resumo em linguagem simples com preferências, habilidades atuais, objetivos e ajustes sugeridos. O aluno pode voltar, corrigir as respostas e conferir novamente o resumo. A opção **Atualizar meu diagnóstico**, no perfil, abre o mesmo fluxo preenchido com os dados atuais. Cada confirmação acrescenta uma revisão ao histórico protegido no banco, sem apagar as versões anteriores.

## Revisão espaçada

Uma conclusão agenda a próxima prática sem apagar conquistas anteriores:

- 1 dia quando houve dica, ajuda ou confiança final baixa;
- 3 dias após a primeira conclusão autônoma;
- 7 dias após a segunda;
- 14 dias nas práticas seguintes.

O motivo é exibido em linguagem simples. A atualização é feita por trigger idempotente sobre a tentativa concluída.

## Missão diária

Existe uma escolha por aluno e data do banco. Uma revisão vencida tem prioridade. Caso contrário, o sistema considera missão obrigatória, diagnóstico, histórico e duração máxima de sete minutos. Repetir a consulta no mesmo dia devolve a mesma missão.

## Privacidade e funcionamento sem rede

O diagnóstico contém apenas opções estruturadas; não há campo livre nem envio desses valores para logs. Diagnóstico pendente, missão diária e plano de revisão ficam em cache local separado por usuário. Em modo offline o app mostra o último plano disponível e tenta sincronizar o diagnóstico quando a conexão voltar. O banco permanece como fonte de verdade.

## Cobertura

`supabase/tests/learning_path.sql` valida autorização, RLS, histórico, respostas adicionais, entradas inválidas, personalização, agendamento e idempotência. `src/lib/learning-path-cache.test.ts` cobre gravação offline, sincronização posterior e leitura do plano em cache. `src/lib/diagnostic-draft.test.ts` e `__tests__/diagnostic-screen.test.tsx` cobrem restauração do formulário, isolamento por usuário, progresso, foco anunciado, seleção única e múltipla, áreas semânticas e texto ampliado.
