# Autorização server-side, cenários de teste e logs

> Nota de atualização (3 de setembro de 2026): o modelo de monitor por turma foi
> substituído pelos papéis `participant` e `admin` global na issue #23. Os casos
> históricos `MON-*` abaixo permanecem como rastreabilidade da decisão anterior,
> mas não definem o comportamento atual. Para implementação e homologação, valem
> as migrações mais recentes, os testes pgTAP e
> [`../architecture/current-product-state.md`](../architecture/current-product-state.md).

Este é o contrato de segurança para o backend. A interface mobile melhora a
experiência, mas não autoriza nada: rota, papel, UUID, turma ou payload enviados
pelo cliente são sempre não confiáveis.

## Princípios de autorização

- `auth.uid()` identifica a sessão Supabase; e-mail e Google `sub` nunca entram
  diretamente nas regras de domínio.
- O papel existe em `memberships`, no contexto de uma turma. Uma mesma conta pode
  ser participante em uma turma e monitor em outra.
- `admin` é uma concessão global independente em `administrators`. Pode haver
  vários admins ativos, todos com o mesmo nível máximo; não há subtipos.
- Conceder ou revogar admin exige função server-side, autenticação recente e
  auditoria. O banco proíbe remover o último administrador ativo.
- Toda operação exige conta não bloqueada, turma `active` e vínculo `active`, além
  da regra específica do recurso.
- Uma pessoa sem vínculo ativo acessa somente login/logout, Central de
  Privacidade, exportação e exclusão server-side. O catálogo não é público para
  qualquer conta autenticada.
- Quando um vínculo termina, o acesso operacional acaba imediatamente. Dados
  próprios ainda retidos ficam disponíveis por exportação de privacidade, não por
  uma brecha na RLS.
- O monitor vê apenas participantes, progresso e ajuda necessários nas turmas que
  monitora. E-mail Google, `sub`, tokens, preferências privadas e payload técnico
  bruto não fazem parte dessa visão.
- Toda operação privilegiada valida a sessão, deriva o sujeito no servidor e é
  deny-by-default. `service_role`/secret key nunca entra no bundle mobile.
- Revogar vínculo ou arquivar turma deve bloquear a próxima consulta mesmo com o
  JWT ainda válido.

## Matriz de acesso normativa

| Recurso/operação | Participante com vínculo ativo | Monitor com vínculo ativo | Admin global ativo | Função server-side |
| --- | --- | --- | --- | --- |
| Próprio perfil | Ler; atualizar somente campos permitidos | Ler/atualizar o próprio | Ler/atualizar o próprio | Provisionar, bloquear e excluir |
| Perfil de participante | Negado, salvo o próprio | Ler apresentação mínima de participante na turma monitorada | Ler para administração global | Exportar/excluir para o titular |
| E-mail/`sub`/identidade Google | Sem leitura direta no domínio | Negado para terceiros | Sem acesso direto; usa perfil mínimo | Auth/provisionamento mínimo |
| Preferências | Ler/alterar somente as próprias | Ler/alterar somente as próprias; nunca as do participante | Ler excepcionalmente para suporte; não alterar | Exportar/excluir para o titular |
| Turma | Ler resumo da própria turma | Ler/alterar turma monitorada nas colunas permitidas | Ler e administrar todas | Criar e executar correções privilegiadas |
| Vínculos | Ler somente o próprio | Ler o próprio vínculo e vínculos mínimos da turma | Ler todos; revogar por RPC auditada | Criar, mudar papel e conceder/revogar admin |
| Convites | Sem acesso direto | Criar/listar convite da própria turma por RPC segura, sem hash | Ler para suporte operacional | Gerar token, consumir, revogar e limpar |
| Missão publicada | Ler quando atribuída à própria turma | Ler para atribuir/acompanhar turma | Ler todo o catálogo | Criar, versionar e publicar catálogo |
| Atribuição | Ler a disponível na própria turma | Criar/alterar na turma monitorada e com versão publicada | Gerenciar em todas as turmas | Correção administrativa auditada |
| Tentativa | Criar/ler própria; atualizar apenas progresso permitido | Ler visão pedagógica na turma; nunca alterar | Ler para operação e suporte | Fechar/reparar de forma auditada |
| Evento de tentativa | Inserir/listar somente na própria tentativa e com schema permitido | Ler somente evento pedagógico permitido da turma | Ler para operação e suporte | Processar sync/retention |
| Pedido de ajuda | Criar/ler/cancelar o próprio nos estados permitidos | Ler/assumir/resolver na turma; campos fechados ficam imutáveis | Ler e atualizar em todas as turmas | Correção excepcional auditada |
| Indicadores/relatórios | Ver somente os próprios | Ver agregados da turma, com limite contra reidentificação | Ver agregados globais | Computar agregado anonimizado |
| Exportação | Exportar somente a própria pessoa | Exportar somente seus próprios dados, não a turma | Exportar somente os próprios dados, não toda a base | Gerar pacote do sujeito da sessão |
| Exclusão | Excluir somente a própria conta | Excluir somente a própria conta | Excluir a própria conta somente se outro admin permanecer ativo | Executar purga idempotente e retenções |
| Logs/auditoria | Sem consulta | Sem consulta | Ler eventos administrativos mínimos | Equipe autorizada em sistema separado |

Views e RPCs devem projetar apenas colunas permitidas. Uma policy RLS que deixa o
monitor selecionar uma linha inteira não é minimização suficiente.

## Fixtures mínimas dos testes

| Ator | Contexto |
| --- | --- |
| `anon` | Sem JWT |
| `orphan` | Conta Google autenticada, sem vínculo |
| `pa` | Participante ativo da turma A |
| `pb` | Outro participante ativo da turma A |
| `pc` | Participante ativo da turma B |
| `ma` | Monitor ativo somente da turma A |
| `mb` | Monitor ativo somente da turma B |
| `mr` | Ex-monitor da turma A com vínculo inativo |
| `dual` | Participante na turma A e monitor na turma B |
| `ga` | Administrador global ativo |
| `gb` | Segundo administrador global ativo |

Todos usam dados sintéticos. Cada teste roda pela API pública com JWT do ator,
nunca diretamente como owner do banco. Para `SELECT`, a negação pode ser lista
vazia; para escrita, erro de policy/validação. O teste deve provar ausência de
linha/efeito no banco, não apenas conferir uma tela.

## Cenários de aceite

### Fronteira e identidade

| ID | Ação | Resultado esperado |
| --- | --- | --- |
| AUTH-001 | `anon` consulta qualquer tabela pública | Nenhuma linha/negação; `anon` não possui grant |
| AUTH-002 | `orphan` consulta catálogo, turma, perfil de terceiro ou progresso | Negado; só Central de Privacidade/logout estão disponíveis |
| AUTH-003 | `orphan` permanece sem vínculo por 24 h | Job remove identidade/perfil órfãos e revoga a sessão |
| AUTH-004 | Qualquer ator envia `role=monitor` ou troca o papel no estado local | Privilégios não mudam; papel vem de vínculo server-side |
| AUTH-005 | Cliente tenta usar secret/service key | A chave não existe em bundle, env pública, artifact ou log; build/check falha se detectada |
| AUTH-006 | Sessão expirada, conta bloqueada ou usuário removido chama RPC sensível | Negado mesmo que o cliente conserve cache |

### Participante

| ID | Ação | Resultado esperado |
| --- | --- | --- |
| PART-001 | `pa` lê e altera nome/preferências próprios nas colunas permitidas | Permitido |
| PART-002 | `pa` usa o UUID de `pb` ou `pc` para ler perfil/preferência/vínculo | Lista vazia/negação |
| PART-003 | `pa` lista a turma A | Somente resumo permitido e próprio vínculo; não vê e-mails nem dados dos colegas |
| PART-004 | `pa` lê atribuição publicada e disponível da turma A | Permitido; conteúdo de B ou não atribuído é negado |
| PART-005 | `pa` cria tentativa válida e depois lê seus eventos/progresso | Permitido |
| PART-006 | `pa` forja `participant_id`, `class_id`, assignment ou tentativa de `pb` | Negado por policy, FK/trigger e DTO server-managed |
| PART-007 | `pa` tenta alterar score final, papel, autoria ou `recorded_at` server-managed; ou envia `occurred_at` fora da janela aceita | Negado e nenhuma coluna muda |
| PART-008 | `pa` cria evento na própria tentativa com payload allowlisted e repete o mesmo ID pela RPC | Primeira chamada insere; retry autenticado retorna o mesmo resultado/no-op sem duplicar |
| PART-009 | `pa` envia token, e-mail, `audio`, `transcript`, chave desconhecida ou payload acima do limite | Rejeitado antes de persistir e logado sem o valor |
| PART-010 | `pa` cria/cancela pedido próprio em estado permitido | Permitido; não pode pré-atribuir monitor nem escrever resolução |
| PART-011 | `pa` tenta ler/alterar pedido de `pb` | Negado |
| PART-012 | Vínculo de `pa` fica inativo durante a mesma sessão | Próxima leitura/escrita operacional é negada; exportar/excluir a própria conta continua possível |

### Monitor

| ID | Ação | Resultado esperado |
| --- | --- | --- |
| MON-001 | `ma` lista participantes, progresso e ajuda da turma A | Permitido somente nas views/colunas mínimas |
| MON-002 | `ma` informa UUID válido de `pc` ou da turma B | Lista vazia/negação, sem confirmar existência |
| MON-003 | `ma` tenta ler e-mail Google, `sub`, preferências ou payload técnico de `pa` | Colunas ausentes/negação |
| MON-004 | `ma` tenta editar perfil, preferência, tentativa ou evento de `pa` | Negado |
| MON-005 | `ma` cria convite de participante da turma A pela RPC | Permitido; token puro retorna uma vez; hash nunca aparece na listagem |
| MON-006 | `ma` cria convite de monitor, de outra turma, já expirado/aceito ou envia o próprio hash | Negado |
| MON-007 | `ma` cria atribuição para turma A com versão publicada | Permitido; turma B, draft ou janela inválida é negada |
| MON-008 | `ma` assume e resolve ajuda da turma A | Permitido se continua ativo; nota/resolução fechada fica imutável |
| MON-009 | `ma` tenta assumir ajuda com `assigned_monitor_id` referente a monitor inativo/de outra turma | Negado |
| MON-010 | Vínculo de `ma` é revogado com JWT ainda válido | Próxima consulta à turma A é negada imediatamente |
| MON-011 | Turma A é arquivada | Operações normais da turma são negadas; somente rotina administrativa explícita acessa retenção |
| MON-012 | `ma` solicita exportação pessoal | Pacote traz somente dados de `ma`, nunca participantes da turma |
| MON-013 | `ma` consulta perfil de outro monitor da turma A | Negado, salvo futura função de colaboração com view/finalidade próprias; o próprio vínculo continua visível |

### Administrador global

| ID | Ação | Resultado esperado |
| --- | --- | --- |
| ADM-001 | `ga` lista perfis, turmas e vínculos | Permitido em todo o ambiente para administração operacional |
| ADM-002 | `ga` revoga vínculo de participante ou monitor | Permitido por RPC; acesso termina imediatamente e um evento de auditoria é criado |
| ADM-003 | Cliente comum tenta inserir em `administrators` ou declarar `role=admin` | Negado; a concessão existe somente no servidor |
| ADM-004 | `ga` revoga `gb` após reautenticação | Permitido e auditado enquanto `ga` continua ativo |
| ADM-005 | Tentativa de revogar ou excluir o último admin ativo | Negada pelo banco |
| ADM-006 | `ga` solicita exportação pessoal | Retorna somente os dados de `ga`, nunca um dump global |

### Contextos mistos e operações de privacidade

| ID | Ação | Resultado esperado |
| --- | --- | --- |
| CTX-001 | `dual` consulta a turma A | Age apenas como participante; não recebe privilégios de monitor da turma B |
| CTX-002 | `dual` consulta a turma B | Age como monitor apenas na turma B |
| CTX-003 | Um papel é usado fora do `class_id` em que existe | Negado; papel nunca é global |
| CTX-004 | Provisionamento tenta dar `participant` e `monitor` à mesma pessoa na mesma turma | Negado; papel duplo só é permitido em turmas diferentes |
| PRIV-001 | `pa` pede exportação alterando `user_id` para `pb` | Backend ignora o ID e exporta somente `auth.uid()` |
| PRIV-002 | `pa` pede exclusão duas vezes | Operação idempotente; conta permanece bloqueada e a segunda chamada não falha nem recria dados |
| PRIV-003 | Exclusão de participante com tentativas/ajuda e de monitor com convites/atribuições | Purga termina sem violar FK; nenhuma PII operacional fica no banco ativo, exceto registro mínimo D13/D14 com base e prazo próprios |
| PRIV-004 | Backup anterior à exclusão é restaurado | Ledger reaplica purga antes de reabrir o ambiente |
| PRIV-005 | Operação privilegiada é chamada sem JWT, com JWT de outro ambiente ou sem reautenticação | Negada |
| PRIV-006 | Usuário sai/troca de conta | SecureStore, cache, fila, exportação e dados visuais anteriores são apagados |

### Propriedades a automatizar

- matriz de ator × tabela × operação deve ser deny-by-default;
- UUIDs de recursos trocados aleatoriamente nunca ampliam conjunto de linhas;
- vínculo/turma inativados entre duas requests bloqueiam a segunda;
- cada JSON persiste somente chaves/tipos/tamanhos allowlisted;
- valores-canário proibidos não aparecem no banco, logs, traces ou resposta;
- migração nova não pode criar tabela pública sem RLS, grants e testes negativos;
- `service_role` só é usada em função isolada e não desativa a validação do
  sujeito da operação.

## Contrato de logs

### Eventos e campos permitidos

Logs de aplicação usam allowlist, nunca serialização de objeto bruto:

| Campo | Regra |
| --- | --- |
| `timestamp` | UTC gerado pelo coletor |
| `environment` | `development`, `staging` ou `production` |
| `app_version` | Versão/build sem identificador do aparelho |
| `event` | Código fechado, como `auth.completed` ou `rls.denied` |
| `result` | Enum fechado: `ok`, `denied`, `invalid`, `error` |
| `request_id` | Aleatório por request; não derivado da pessoa |
| `duration_ms` | Número arredondado quando útil |
| `provider` | Enum fechado, por exemplo `google`/`supabase`, sem resposta bruta |
| `reason_code` | Código interno sem mensagem do usuário ou do provedor |

Somente logs de segurança que realmente precisem correlacionar ações podem usar
`actor_ref`: HMAC rotativo, com chave server-side diferente por ambiente, acesso
restrito e prazo D12. Ainda é dado pessoal pseudonimizado. Logs operacionais não
usam identificador estável.

Esta allowlist é do logger da aplicação. Logs nativos de gateway/Auth do Supabase
podem conter IP, user-agent ou identificador de dispositivo quando indispensáveis
à segurança. Eles ficam em dataset de infraestrutura separado, com acesso mínimo,
campos/retention D12 e sem cópia para o logger do app. Antes de production, a
equipe deve inventariar e configurar o que o fornecedor realmente conserva.

Exemplo permitido:

```json
{
  "environment": "staging",
  "app_version": "0.1.0",
  "event": "auth.completed",
  "result": "ok",
  "request_id": "req_demo_7f2c",
  "provider": "google",
  "duration_ms": 180
}
```

Exemplo permitido de negação, sem revelar alvo ou ator:

```json
{
  "environment": "production",
  "event": "authorization.denied",
  "result": "denied",
  "request_id": "req_demo_93ab",
  "reason_code": "CLASS_SCOPE_MISMATCH"
}
```

### Campos e conteúdo proibidos

Nunca registrar, mesmo em development ou como breadcrumb:

- header `Authorization`, cookies, senha, nonce, código OAuth, access token,
  refresh token, ID token ou provider token;
- token puro ou hash de convite;
- nome, e-mail, Google `sub`, UUID estável de usuário ou URL do avatar;
- mensagem/nota de ajuda, texto digitado ou payload bruto de tentativa;
- áudio, transcrição, derivado de voz ou buffer binário/base64;
- corpo integral de request/response, query string ou callback/deep link;
- objetos de erro do Google/Supabase sem mapeamento explícito;
- preferências de acessibilidade, turma ou progresso individual.

Um exemplo de documentação de campo bloqueado usa somente marcadores, nunca um
valor semelhante a credencial real:

```json
{
  "authorization": "[REDACTED]",
  "email": "[REDACTED]",
  "voice": "[DROPPED]"
}
```

### Sanitização e testes

1. O logger aceita apenas eventos tipados e campos allowlisted. `console.log` de
   objetos de Auth/API é proibido por revisão e deverá ser bloqueado por uma regra
   `no-console`/equivalente antes de production; o ESLint atual ainda não aplica
   esse gate.
2. Um sanitizer recursivo remove chaves proibidas, headers, query strings,
   mensagens livres e dados aninhados antes de qualquer transporte.
3. Erros externos são mapeados para `reason_code`; stack trace passa por scrubber
   e source maps ficam privados.
4. Valores-canário sintéticos de e-mail, token, nome e transcrição são injetados
   nos testes. A pipeline busca os canários em stdout, artefatos e coletor e falha
   se encontrar qualquer um.
5. Development não recebe dados reais. Staging usa somente identidades e conteúdo
   sintéticos. Acesso a logs de production aplica menor privilégio e auditoria.
6. Jobs de retenção expiram logs operacionais conforme D11, logs de segurança
   conforme D12 e incidentes conforme D14.

## Estado da base atual

Já existem RLS em todas as tabelas públicas, grants anônimos foram removidos,
escritas usam colunas específicas e o seed é sintético. Não há logger, analytics
ou áudio real no código atual. Os cenários acima são o critério para fortalecer e
provar as policies; as divergências conhecidas estão listadas em
[Direitos e operação](rights-and-operations.md#lacunas-técnicas-que-bloqueiam-production).
