# Diagnóstico, revisão espaçada e missão diária

## Objetivo

Os três recursos formam uma trilha simples e explicável: o diagnóstico registra como o aluno prefere aprender; as recomendações priorizam seus objetivos e áreas de menor confiança; após uma conclusão, o sistema agenda revisões e escolhe uma missão curta por dia.

## Diagnóstico inicial

O aluno informa nível de experiência, formato preferido, uma ou mais categorias de interesse e confiança de 1 a 5 em cada categoria. Não é uma avaliação clínica nem uma prova. A interface salva primeiro no aparelho e sincroniza quando houver conexão. Apenas o próprio aluno e administradores globais podem ler o registro; escrita direta nas tabelas é bloqueada por RLS e a validação ocorre na RPC.

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

`supabase/tests/learning_path.sql` valida autorização, RLS, entradas inválidas, personalização, agendamento e idempotência. `src/lib/learning-path-cache.test.ts` cobre gravação offline, sincronização posterior e leitura do plano em cache.
