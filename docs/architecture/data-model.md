# Modelo de dados inicial do MVP

Este documento apresenta o esquema criado pelas migrações em
`supabase/migrations/`, incluindo o endurecimento de autorização da migração
`202608230003_harden_role_authorization.sql`. O Postgres é a
fonte de verdade; este desenho serve para leitura e revisão do domínio.

## Princípios

- `auth.users.id` é a identidade estável. E-mail não é chave de autorização.
- Os papéis pedagógicos não são globais nem informados pelo aplicativo: pertencem
  a vínculos ativos em `memberships`. `admin` é o único papel global e existe em
  `administrators`, separado dos vínculos de turma.
- Pode haver vários administradores globais ativos. O banco impede a revogação
  ou exclusão do último, evitando que o ambiente fique sem administração.
- Uma pessoa pode ser participante em uma turma e monitor em outra, sem duplicar
  a conta Google. Os dois papéis na mesma turma serão proibidos no provisionamento;
  a constraint inicial ainda precisa ser fortalecida para impor essa decisão.
- Conteúdo de missão é imutável por versão. Tentativas e eventos apontam para a
  versão praticada, preservando o histórico.
- IDs são UUIDs e horários são `timestamptz`.
- Tabelas expostas têm RLS habilitada e acesso anônimo é negado por padrão.
- Fotos, localização, dados bancários e gravações de voz reais não fazem parte
  deste modelo. As missões persistem apenas conteúdo e eventos de simulação.

## Relações

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "possui"
    PROFILES ||--|| PREFERENCES : "configura"
    PROFILES ||--o{ MEMBERSHIPS : "participa"
    PROFILES ||--o| ADMINISTRATORS : "pode administrar"
    PROFILES ||--o{ ADMIN_AUDIT_EVENTS : "executa"
    CLASSES ||--o{ MEMBERSHIPS : "reune"
    CLASSES ||--o{ INVITATIONS : "oferece"
    PROFILES ||--o{ INVITATIONS : "cria ou aceita"

    MISSIONS ||--o{ MISSION_VERSIONS : "versiona"
    MISSION_VERSIONS ||--o{ MISSION_STEPS : "ordena"
    CLASSES ||--o{ CLASS_MISSION_ASSIGNMENTS : "recebe"
    MISSION_VERSIONS ||--o{ CLASS_MISSION_ASSIGNMENTS : "e atribuida"

    CLASS_MISSION_ASSIGNMENTS ||--o{ ATTEMPTS : "origina"
    PROFILES ||--o{ ATTEMPTS : "realiza"
    ATTEMPTS ||--o{ ATTEMPT_EVENTS : "registra"
    ATTEMPTS ||--o{ HELP_REQUESTS : "contextualiza"
    CLASSES ||--o{ HELP_REQUESTS : "encaminha"
    PROFILES ||--o{ HELP_REQUESTS : "solicita ou atende"
```

## Entidades

| Tabela | Responsabilidade | Invariantes principais |
| --- | --- | --- |
| `profiles` | Nome, avatar e estado da conta autenticada | PK/FK para `auth.users`; nasce `pending`, só acessa o domínio quando `active` e perde acesso imediatamente quando `blocked`. |
| `preferences` | Acessibilidade, áudio, voz, idioma e onboarding | Uma linha por perfil; o usuário só acessa a própria linha. |
| `classes` | Turma de aprendizagem | Estado `active` ou `archived`; somente membros ativos leem. |
| `memberships` | Papel de uma pessoa dentro de uma turma | Único por turma, pessoa e papel; `participant` ou `monitor`; revogação é server-side. |
| `administrators` | Concessão do papel global de maior privilégio | Vários admins podem estar ativos; o último ativo não pode ser removido; escrita apenas server-side. |
| `admin_audit_events` | Rastro mínimo de operações administrativas | Registra ator, ação, alvo, turma e horário; não armazena nome, e-mail, token ou conteúdo livre. |
| `invitations` | Autorização prévia para entrar em uma turma | E-mail normalizado, campo de hash em formato hexadecimal, expiração e consumo único. A migração atual não prova algoritmo/entropia; geração server-side ainda é obrigatória. |
| `missions` | Identidade estável do item de catálogo | Slug único, categoria, dificuldade, duração e estado. |
| `mission_versions` | Conteúdo publicável de uma missão | Versão crescente por missão; no máximo uma versão publicada por vez. |
| `mission_steps` | Passos, instruções, áudio, dicas e ação esperada | Posição única na versão; objetos e listas são validados como JSON. |
| `class_mission_assignments` | Liberação de uma versão para uma turma | Criada por monitor ativo; janela de disponibilidade e obrigatoriedade opcionais. |
| `attempts` | Execução de uma missão por participante | Vínculo, turma, versão e atribuição coerentes por FKs compostas; só uma tentativa em andamento por atribuição. |
| `attempt_events` | Linha do tempo append-only da tentativa | PK e sequência única impedem duplicata, mas retry hoje retorna conflito; idempotência exige RPC futura com `ON CONFLICT` seguro. |
| `help_requests` | Pedido contextual de ajuda ao monitor | Pertence à mesma turma/tentativa; estados `open`, `in_progress`, `resolved` ou `cancelled`. |

## Autorização inicial

Esta tabela descreve a fundação criada na primeira migração. O contrato normativo
e os testes obrigatórios estão em
[`docs/privacy/authorization-and-logging.md`](../privacy/authorization-and-logging.md).
Antes de production, as policies precisam ser fortalecidas para exigir conta,
turma e vínculo ativos de forma uniforme e para projetar somente as colunas
necessárias ao monitor.

| Recurso | Participante | Monitor | Admin global |
| --- | --- | --- | --- |
| Perfil | Lê e atualiza o próprio | Lê o próprio e perfis vinculados às suas turmas | Lê perfis para administrar contas; alterações sensíveis são server-side |
| Turma e vínculos | Lê as próprias turmas e vínculos | Lê vínculos das turmas monitoradas | Lê todas as turmas; revoga vínculos por RPC auditada |
| Convites | Sem acesso direto | Cria e lê convites de participante da própria turma | Lê todos para suporte operacional |
| Catálogo | Lê missões ativas e versões publicadas | Mesmo acesso de leitura | Lê todo o catálogo; publicação continua server-side |
| Atribuições | Lê as da própria turma | Cria, altera e arquiva nas turmas monitoradas | Gerencia em todas as turmas |
| Tentativas e eventos | Cria e lê somente os próprios | Somente leitura nas turmas monitoradas | Lê para suporte, segurança e operação |
| Preferências | Lê e altera somente as próprias | Lê e altera somente as próprias | Leitura excepcional para suporte; alteração negada |
| Pedidos de ajuda | Cria e lê somente os próprios | Lê e atende os pedidos das turmas monitoradas | Lê e atualiza em todas as turmas |

Criação de turma, ativação/revogação de vínculo, consumo de convite e publicação
de conteúdo não têm policy de escrita para o cliente. Essas operações serão feitas
por função server-side autenticada e auditável nas issues correspondentes.

## Lacunas conhecidas de privacidade

A migração inicial não implementa ainda o ciclo completo da Issue #2:

- FKs de autoria e histórico impedem apagar uma conta com um simples
  `DELETE auth.users`; a purga precisa de transação idempotente e tombstones;
- a leitura atual de `invitations` expõe `token_hash` ao monitor;
- `attempts.metadata`, `attempt_events.payload` e os textos de ajuda precisam de
  allowlist, limite e bloqueio de PII/voz/transcrição;
- o participante ainda não possui RPC para cancelar o próprio pedido de ajuda;
- convite ainda aceita qualquer expiração futura; o limite de sete dias e a
  geração criptográfica no servidor precisam ser impostos por RPC/constraint;
- `attempt_events.recorded_at` e `occurred_at` ainda podem ser informados pelo
  cliente; o primeiro deve vir do servidor e o segundo precisa de janela válida;
- algumas policies do titular não exigem vínculo ativo, e os helpers ainda não
  consideram de modo uniforme turma arquivada e tipo do usuário monitorado;
- pedidos de ajuda precisam validar monitor ativo e imutabilidade após fechamento.

O inventário técnico, a ordem de exclusão e a evidência esperada estão em
[`docs/privacy/rights-and-operations.md`](../privacy/rights-and-operations.md#lacunas-técnicas-que-bloqueiam-production).
Essas lacunas ficam explícitas para que a fundação não seja confundida com uma
autorização pronta para dados reais.

## Estados relevantes

```text
membership: active → inactive
mission version: draft → published → retired
assignment: scheduled → active → archived
attempt: in_progress → completed | abandoned
help request: open → in_progress → resolved
                         └────────→ cancelled
```

Os triggers impedem reabrir tentativas e pedidos de ajuda fechados e protegem os
campos de identidade de tentativas, atribuições e pedidos depois da criação.
Transições de `classes` e `class_mission_assignments` ainda não têm máquina de
estados: o grant atual permite, por exemplo, `archived → active`. A próxima
migração deve definir transições autorizadas e correção administrativa auditada.

## Evolução do schema

Migrações são forward-only e imutáveis depois de promovidas. Para alterar o
modelo, crie um novo arquivo com `npm run backend:migration:new -- nome`, faça um
reset local completo e revise FKs, índices, grants e policies RLS. O seed contém
somente catálogo sintético e nunca deve receber dados de produção.
