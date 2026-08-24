# Configuração do ambiente de desenvolvimento

Este documento descreve como executar o aplicativo e a infraestrutura do MVP. Autenticação, perfis, turmas, vínculos, convites e projeções de participantes usam Supabase; missões e algumas métricas visuais ainda possuem superfícies demonstrativas explicitamente identificadas.

## Pré-requisitos

- Node.js 22.13 ou superior (a versão recomendada está em `.nvmrc`);
- npm 10 ou superior;
- Expo Go compatível com o SDK 57 ou um development build;
- Docker Desktop, OrbStack, Colima ou outro runtime compatível com Docker para o Supabase local;
- Supabase CLI instalada pelo `npm ci` como dependência de desenvolvimento do projeto;
- Android Studio para emulador Android ou macOS/Xcode para simulador iOS.

O Supabase local é apenas para desenvolvimento. Ele usa credenciais padrão, não oferece TLS nem rate limiting e não deve ser exposto à internet.

## Aplicativo

As validações estáticas podem ser executadas sem o backend. Login e dados de
turma exigem as variáveis públicas do ambiente:

```bash
npm ci
npm run typecheck
npm run lint
npm run start
```

Atalhos disponíveis no terminal do Expo:

- `a`: Android;
- `i`: iOS, quando executado no macOS;
- `w`: versão web de apoio.

Também é possível usar `npm run android`, `npm run ios` ou `npm run web`.

## Variáveis locais

Quando a integração for adicionada, copie o modelo versionado para um arquivo local ignorado pelo Git:

```bash
cp .env.example .env.local
```

Contrato mínimo do cliente:

```dotenv
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<valor exibido por supabase status>
```

As variáveis `EXPO_PUBLIC_*` são incorporadas ao bundle e nunca podem conter segredos. A URL do Supabase e a chave publicável são identificadores públicos; a proteção dos dados deve ser feita por autenticação, autorização e Row Level Security (RLS).

O fluxo escolhido pode precisar do client ID web público:

```dotenv
EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID=<client-id-web>
```

Client IDs identificam o aplicativo e não são segredos. IDs específicos de iOS e Android só devem ganhar nomes no contrato depois da escolha da biblioteca/config plugin. O client secret do Google pertence exclusivamente à configuração do Supabase:

```dotenv
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=<secret-local>
```

Nunca adicione ao cliente ou a uma variável `EXPO_PUBLIC_*`:

- `SUPABASE_SERVICE_ROLE_KEY` ou secret key;
- senha do banco;
- client secret do Google;
- tokens de acesso do Supabase, Expo, Sentry, Apple ou Google Cloud;
- chaves de assinatura ou arquivos de service account.

## Supabase local

O arquivo `supabase/config.toml` mantém somente configuração não secreta. O provedor Google fica desativado por padrão para que qualquer pessoa consiga iniciar banco, Auth e Studio sem receber credenciais externas.

```bash
npm run backend:start
npm run backend:status
```

O primeiro comando baixa e inicia os contêineres. O segundo mostra a URL local, a chave publicável, o endereço do Studio e o servidor local de e-mails. A saída também contém credenciais administrativas locais: copie para o aplicativo somente `API_URL` e `PUBLISHABLE_KEY`; não coloque `SECRET_KEY`, `SERVICE_ROLE_KEY` ou `JWT_SECRET` em `EXPO_PUBLIC_*`, arquivos versionados ou mensagens.

Para iniciar o app em outro terminal:

```bash
npm run start
```

Para encerrar a infraestrutura sem apagar os dados:

```bash
npm run backend:stop
```

Para reconstruir o banco local a partir das migrações e seeds:

```bash
npm run backend:reset
```

`db reset` é destrutivo para o banco selecionado. Use sempre `--local` no trabalho diário e nunca execute `db reset --linked` em staging ou produção.

### Emulador e aparelho físico

- iOS Simulator e web local podem usar `http://127.0.0.1:54321`;
- Android Emulator normalmente acessa o computador por `http://10.0.2.2:54321`;
- um aparelho físico não resolve `127.0.0.1` como o computador.

Para validar Google OAuth em aparelhos físicos, prefira o projeto remoto de staging. Não publique as portas do Supabase local na internet: a stack local não é endurecida para esse uso.

## Google OAuth

Participante e monitor usam o mesmo provedor Google. O papel não é escolhido nem confiado pelo cliente; ele é resolvido pelo backend a partir do vínculo autorizado do usuário.

No Google Cloud e no Supabase de cada ambiente:

1. cadastre clientes OAuth separados para web, iOS e Android;
2. configure o callback do Supabase no cliente web;
3. permita somente os redirects pertencentes ao ambiente;
4. solicite apenas os escopos `openid`, `email` e `profile`;
5. mantenha o client secret no secret store do Supabase;
6. use contas Google de teste sem dados pessoais reais em development e staging.

Callback padrão do Supabase local:

```text
http://127.0.0.1:54321/auth/v1/callback
```

Redirects esperados pelo aplicativo:

```text
celularsemmedo-dev://auth/callback
celularsemmedo-staging://auth/callback
celularsemmedo://auth/callback
```

O redirect de produção não pode constar nas listas de development ou staging. O login local com Google exige habilitar temporariamente `[auth.external.google]` e referenciar o segredo por `env(...)`; nunca grave o valor no TOML.

## Migrações

Toda alteração estrutural deve nascer como arquivo SQL versionado em `supabase/migrations/`:

```bash
npx supabase migration new nome_da_alteracao
```

Fluxo esperado:

1. escreva a alteração e as políticas RLS na nova migração;
2. execute `npx supabase db reset --local`;
3. valide os dois papéis e tentativas de acesso indevido;
4. gere novamente os tipos TypeScript com `npm run backend:types`;
5. inclua migração, tipos e testes no mesmo pull request;
6. aplique primeiro em staging;
7. promova a mesma migração imutável para produção após o smoke test.

Uma migração já aplicada em ambiente compartilhado não deve ser editada. Correções são feitas por uma nova migração forward-only.

Antes de aplicar remotamente:

```bash
npx supabase link --project-ref <project-ref-do-ambiente>
npx supabase migration list
npx supabase db push --linked --dry-run
```

O `db push --linked` efetivo deve rodar por pipeline com ambiente e aprovação explícitos, não como passo habitual na máquina local.

## Seeds

O seed padrão fica em `supabase/seed.sql` e é executado depois das migrações em `supabase start` e `supabase db reset`.

Regras:

- usar somente dados sintéticos e determinísticos;
- nunca copiar nomes, e-mails, progresso, áudio ou IDs de produção;
- manter IDs estáveis para testes automatizados;
- incluir o catálogo sintético representativo com IDs estáveis;
- não criar identidades fictícias em `auth.users`: contas e vínculos de teste serão provisionados pelo fluxo de Auth/backend nas issues correspondentes;
- manter seeds idempotentes quando forem usados fora do reset local;
- não executar o seed de demonstração em produção.

Staging usa `supabase/seeds/staging.sql`. Antes da execução, uma pessoa autorizada
marca as contas Google sintéticas em `auth.users.raw_app_meta_data` com
`csm_staging_role` e `csm_staging_class`, sem registrar e-mail no arquivo. O seed
falha se não encontrar ao menos monitor e participante, ativa seus perfis e cria
turma/vínculos idempotentes. Ele nunca deve ser executado em production.

Produção recebe apenas dados mínimos de catálogo ou configuração por migração
revisada, nunca os seeds local ou de staging.

## Verificações antes de abrir um pull request

Execute o que já existe no repositório:

```bash
npm run lint
npm run typecheck
npm run export
npm run audit
```

Quando testes e Supabase forem integrados, o gate também deve incluir:

```bash
npm test
npx supabase db reset --local
npx supabase test db
```

## Problemas comuns

### O app não alcança o Supabase

Confirme `npm run backend:status`, a URL do ambiente e se o app está em simulador, emulador ou aparelho físico. Não troque silenciosamente staging por produção para contornar conectividade local.

### O callback retorna para uma tela inválida

Confira o scheme do build, o redirect enviado pelo cliente, a allowlist do Supabase e o cliente OAuth do Google. Os quatro valores precisam pertencer ao mesmo ambiente.

### Uma migração funciona apenas na máquina de quem a criou

Execute `npx supabase db reset --local` em um banco limpo. Se falhar, a mudança depende de estado manual não versionado e deve ser corrigida antes do merge.

### Uma credencial apareceu no histórico Git

Revogue e rotacione a credencial imediatamente. Remover o texto em um commit posterior não torna o segredo seguro.

## Referências

- [Fluxo local com Supabase CLI](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Configuração e segredos locais](https://supabase.com/docs/guides/local-development/managing-config)
- [Login Google com Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Migrações de banco](https://supabase.com/docs/guides/local-development/database-migrations)
- [Seeds de banco](https://supabase.com/docs/guides/local-development/seeding-your-database)
