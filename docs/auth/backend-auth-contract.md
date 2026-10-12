# Contrato de autenticação backend

## Decisão

O projeto não emite uma segunda sessão própria. Supabase Auth é o backend de
identidade e sessão decidido na ADR-0001. Ele recebe o retorno do Google, valida
o token do provedor e emite access/refresh tokens Supabase. Duplicar esse trabalho
em endpoints próprios aumentaria a superfície de ataque e criaria duas fontes de
revogação.

Os endpoints pedidos na Issue #4 são atendidos pelos equivalentes abaixo:

| Contrato do produto | Implementação |
| --- | --- |
| `auth/google` | Supabase `/auth/v1/authorize` + callback PKCE do SDK |
| `auth/refresh` | Supabase `/auth/v1/token?grant_type=refresh_token`, chamado pelo SDK |
| `auth/logout` | `supabase.auth.signOut({ scope: 'local' })` |
| `auth/me` | RPC autenticada `get_my_auth_context()` |

O Supabase Auth valida assinatura, issuer, audience/client ID, expiração e a
identidade Google antes de criar `auth.users`/`auth.identities`. O domínio usa
somente `auth.users.id`/`auth.uid()` como identificador estável. `provider` e
`provider_id` (`sub`) permanecem no schema protegido do Auth; e-mail e metadata
Google nunca são chave de autorização.

## Sessão

- Access token: 3.600 segundos.
- Refresh rotation: habilitada, reuse interval de 10 segundos.
- Inatividade máxima: 720 horas (30 dias).
- Duração absoluta: 2.160 horas (90 dias).
- O refresh fica no storage seguro no mobile; não aparece em logs ou URLs.
- Logout local encerra apenas a sessão do aparelho atual. Bloqueio de conta nega
  o domínio imediatamente, mesmo durante a validade residual do access token.

Refresh expirado, revogado ou reutilizado fora das exceções do provedor não gera
nova sessão. Os mesmos valores precisam ser configurados no Dashboard de staging
e production; `config.toml` governa somente a stack local.

## Conta e papéis

`profiles.account_status` possui três estados:

| Estado | Código de `auth/me` | Acesso operacional |
| --- | --- | --- |
| `pending` | `ACCOUNT_NOT_PROVISIONED` | Negado |
| `active`, sem papel vigente | `ACCOUNT_NOT_PROVISIONED` | Negado |
| `active`, com vínculo/admin | `null` | Somente papéis server-side ativos |
| `blocked` | `ACCOUNT_BLOCKED` | Negado imediatamente |

Uma identidade Google com e-mail verificado cria perfil `active` e vínculo de
`participant` na turma pública Comunidade Celular Sem Medo. Outros provedores e
identidades sem e-mail verificado continuam `pending`. O provisionamento ocorre
tanto na criação do usuário quanto na vinculação de `auth.identities`, evitando
dependência da ordem interna do OAuth. A entrada pública nunca
concede `admin`; esse papel permanece uma concessão server-side explícita. O
cliente não tem grant para `account_status`, `memberships` ou `administrators`.

Resposta conceitual de `auth/me`:

```json
{
  "user_id": "uuid-da-sessao",
  "account_status": "active",
  "error_code": null,
  "access_roles": ["participant"]
}
```

O RPC ignora `role`, e-mail, UUID ou turma enviados pelo cliente. Uma conta com
papéis em turmas diferentes recebe todos os contextos de `get_my_access_roles()`;
a interface permite escolher apenas entre esses resultados.

## Códigos tratáveis

| Código | Uso |
| --- | --- |
| `ACCOUNT_NOT_PROVISIONED` | Identidade válida, mas conta/vínculo ainda não cadastrados |
| `ACCOUNT_BLOCKED` | Conta bloqueada administrativamente |
| `AUTH_SESSION_INVALID` | Sessão ausente, expirada ou assinatura inválida; retornado pela camada Auth/HTTP |
| `AUTH_REFRESH_REJECTED` | Refresh expirado, revogado ou replay rejeitado pela camada Auth |
| `AUTH_PROVIDER_REJECTED` | Google negou, cancelou ou entregou resposta inválida |
| `AUTH_CONFIGURATION_INVALID` | Client, audience ou callback incorreto |

O aplicativo traduz esses estados em mensagens, sem mostrar detalhes de token,
provider ou existência de outras contas.

## Evidência automatizada

`supabase/tests/authorization_hardening.sql` comprova, com JWTs sintéticos:

- conta pendente recebe código explícito e nenhum papel;
- conta cadastrada recebe somente o papel presente no vínculo;
- forjar `app_metadata.role=monitor` não concede acesso de monitor;
- conta bloqueada recebe código explícito, nenhum papel e perde acesso imediato;
- papéis e turmas alheios permanecem negados.

`npm run backend:test:auth` cria uma identidade sintética na stack local, renova
a sessão, comprova que o refresh foi rotacionado, encerra a sessão e verifica que
o refresh revogado não emite uma nova sessão.

Validação criptográfica Google, expiração/revogação do refresh e callbacks reais
são responsabilidades do Auth e precisam do smoke test de integração da Issue #3
em staging. Não são simulados como se fossem evidência do provedor.
