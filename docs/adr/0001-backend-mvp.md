# ADR-0001: Backend do MVP, autenticação Google e autorização de papéis

- **Status:** Aceita para implementação do MVP
- **Data:** 2026-08-23
- **Decisores:** equipe do Celular Sem Medo
- **Escopo:** backend, identidade, sessão e autorização; não define a biblioteca visual nem o desenho final das telas

## Contexto

O repositório contém hoje um protótipo Expo/React Native com Expo Router. O login é demonstrativo: e-mail e senha não são validados, a pessoa escolhe livremente entre `participant` e `monitor`, e o papel autenticado existe apenas em memória no `AppContext`. As rotas protegidas melhoram a navegação, mas não constituem autorização de segurança. Também não há API, banco de dados, persistência de sessão, configuração de ambientes ou testes de autorização.

O produto precisa evoluir para um MVP mobile no qual:

- participantes e monitores entram com uma conta Google;
- Google comprova a identidade, mas não concede o papel de participante ou monitor;
- dados de turmas, participantes, missões, tentativas e progresso têm relações naturais entre si;
- um monitor só acessa participantes das turmas às quais está vinculado;
- um participante só acessa seus próprios dados e o conteúdo que lhe foi atribuído;
- alterar estado, rota ou payload no cliente nunca aumenta privilégios;
- a sessão sobrevive ao fechamento do aplicativo sem armazenar credenciais em texto aberto;
- o time consegue entregar e operar o MVP sem construir e manter uma plataforma completa de identidade.

O projeto atual usa saída web estática, mas o produto prioritário é Android/iOS. Não existe uma obrigação de suportar autenticação real no Expo Go.

## Problema de decisão

Escolher o backend do MVP e definir onde ficam as responsabilidades de:

1. autenticar a conta Google;
2. criar e renovar a sessão da aplicação;
3. provisionar participantes e monitores;
4. autorizar cada leitura e escrita;
5. armazenar o modelo relacional do domínio;
6. executar operações privilegiadas sem expor segredos no aplicativo.

## Diretrizes e critérios

Os critérios foram priorizados da seguinte forma:

| Critério | Peso | Motivo |
| --- | ---: | --- |
| Segurança de identidade e autorização server-side | 25% | Um papel escolhido no cliente permitiria acesso indevido a dados de terceiros. |
| Adequação ao domínio relacional | 20% | Turmas, vínculos, atribuições, tentativas e relatórios dependem de relações e agregações. |
| Velocidade de entrega do MVP | 20% | O time não deve construir autenticação, rotação de tokens e infraestrutura básica sem necessidade. |
| Integração Google e sessão em Expo/React Native | 15% | O fluxo principal será mobile e deverá funcionar em Android e iOS. |
| Operação e custo inicial | 10% | O MVP deve começar com pouca carga operacional e crescer de forma observável. |
| Portabilidade e testabilidade | 10% | Esquema, regras e dados não devem ficar impossíveis de migrar ou testar localmente. |

Restrições de segurança que todas as alternativas precisam satisfazer:

- nenhum client secret ou chave administrativa pode entrar no bundle;
- e-mail não pode ser a identidade interna permanente; após o primeiro vínculo, deve-se usar um identificador imutável;
- nenhuma conta pode se tornar monitor por autocadastro ou por escolha na interface;
- o backend deve negar por padrão quando usuário, papel, vínculo ou sessão não forem válidos;
- o aplicativo solicitará somente os escopos Google necessários para login (`openid`, `email` e `profile`), sem acesso a Gmail, Drive, contatos ou agenda;
- tokens, nonces e dados pessoais não podem aparecer em logs, analytics ou relatórios de erro.

## Alternativas consideradas

### A. Supabase gerenciado: Auth, Postgres, RLS e Edge Functions

O aplicativo autentica com Google por meio do Supabase Auth, recebe uma sessão Supabase e acessa Postgres pela Data API. Grants e Row Level Security (RLS) aplicam autorização dentro do banco. Edge Functions são usadas somente para operações com segredos, privilégios administrativos ou transações que não devem ser executadas diretamente pelo cliente.

**Vantagens**

- Auth, sessão, Postgres, migrações, Data API e funções server-side ficam no mesmo ecossistema.
- Postgres representa bem turmas, matrículas, missões, tentativas e relatórios.
- RLS aplica a autorização mesmo quando um cliente modificado chama a API diretamente.
- A chave publicável pode ficar no aplicativo quando grants e RLS estão corretos; a chave secreta permanece no servidor.
- O banco e as migrações SQL oferecem uma rota de saída mais clara do que um modelo proprietário NoSQL.
- Existe documentação oficial para Expo/React Native, Google social login, sessões, RLS e desenvolvimento local.

**Desvantagens e riscos**

- Políticas RLS incorretas podem bloquear funcionalidades ou vazar dados; precisam de testes como código de produção.
- O time passa a depender da disponibilidade, preços e limites do Supabase Auth/Data API/Functions.
- Operações relacionais complexas podem exigir funções SQL ou Edge Functions, e não apenas chamadas diretas do cliente.
- Um login Google válido pode criar um registro em `auth.users` antes de o aplicativo concluir que a conta não foi provisionada; esses registros precisam de política de retenção/limpeza.
- Sessões mobile exigem um adaptador de armazenamento seguro e testes para payloads maiores que os limites históricos do Keychain/SecureStore.

### B. Firebase Authentication, Firestore e Cloud Functions

Firebase oferece integração madura com Google, gerenciamento de sessão, custom claims e Security Rules.

**Vantagens**

- Excelente integração com o ecossistema Google e SDKs mobile.
- Infraestrutura gerenciada, escalável e com bom suporte a dados sincronizados/offline.
- Custom claims e Security Rules permitem autorização server-side.

**Desvantagens e riscos**

- Firestore é documental; vínculos entre turmas, pessoas, missões, tentativas e relatórios exigiriam desnormalização e mais disciplina de consistência.
- Agregações e consultas relacionais tendem a migrar para Cloud Functions ou dados materializados.
- Alterações em custom claims não aparecem até a emissão/renovação do token, o que complica revogação imediata de papel.
- A portabilidade do modelo e das regras é menor do que a de Postgres/SQL.

### C. API própria em Node/TypeScript com Postgres

Uma API própria validaria tokens Google, emitiria sessões internas e concentraria toda regra de negócio. Poderia ser hospedada como serviço independente ou, em parte, com Expo Router API Routes.

**Vantagens**

- Controle máximo sobre contratos, sessão, auditoria, autorização e infraestrutura.
- Postgres continua adequado ao domínio.
- Menor acoplamento a uma plataforma BaaS quando a camada de API é bem isolada.

**Desvantagens e riscos**

- Exige implementar e operar validação de identidade, rotação/revogação de sessão, rate limiting, migrações, observabilidade, deploy, backups e resposta a incidentes.
- Amplia significativamente a superfície de segurança e o prazo do MVP.
- Expo Router API Routes exigiriam uma implantação server-side adicional, enquanto o projeto web atual é estático.
- O benefício de controle não compensa o custo atual; pode voltar a ser atraente quando regras e escala justificarem uma API dedicada.

### D. Google Sign-In apenas no cliente, sem backend autoritativo

O cliente obteria o perfil Google e manteria o papel localmente.

**Vantagem**

- Menor quantidade aparente de implementação.

**Desvantagens**

- Não existe fronteira segura de autorização, persistência multi-dispositivo ou isolamento entre turmas.
- Um aplicativo modificado poderia declarar qualquer papel e acessar endpoints ou dados sem proteção.
- Não atende aos requisitos mínimos e foi descartada independentemente de custo.

## Matriz de decisão

Notas de 1 (muito fraco) a 5 (muito forte). O resultado é uma comparação para o contexto do MVP, não uma avaliação universal dos produtos.

| Alternativa | Segurança (25%) | Relacional (20%) | MVP (20%) | Mobile (15%) | Operação (10%) | Portabilidade (10%) | Nota ponderada |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Supabase | 5 | 5 | 5 | 4 | 4 | 4 | **4,65** |
| Firebase | 4 | 3 | 5 | 5 | 4 | 3 | 4,05 |
| API própria + Postgres | 5 | 5 | 2 | 3 | 2 | 5 | 3,80 |
| Cliente sem backend | 1 | 1 | 5 | 3 | 5 | 1 | 2,50 |

### Custo e operação

Valores consultados em 2026-08-23, em dólares e antes de impostos:

- development usa a stack Docker local e não gera cobrança do provedor;
- o plano Free do Supabase permite dois projetos ativos, 500 MB de banco e
  50.000 usuários ativos mensais, mas pausa projetos após uma semana sem uso;
- o plano Pro parte de US$ 25/mês e inclui os primeiros US$ 10 de compute,
  suficientes para um projeto Micro; cada projeto Micro adicional parte de
  US$ 10/mês, além de excedentes;
- portanto, staging pode começar no Free durante o MVP. Antes de receber dados
  reais, production deve usar ao menos Pro. Se staging e production ficarem na
  mesma organização Pro, a referência inicial é US$ 35/mês para dois projetos
  Micro, antes de excedentes;
- o billing do Supabase é por organização e não permite misturar planos dentro
  dela. Separar staging Free e production Pro reduz o custo, mas aumenta a carga
  de gestão de acesso e promoção;
- Firebase Authentication tem cota gratuita, porém a alternativa relacional
  Firebase Data Connect/Cloud SQL exige billing Blaze após o período de teste e
  distribui custo/operação entre mais serviços;
- uma API própria acrescentaria hospedagem, Postgres, backup e observabilidade,
  além do custo de engenharia para autenticação e operação.

Os valores são referência, não orçamento. O responsável pelo ambiente deve
revisar a página de preços antes de criar production e configurar alertas de uso.

## Decisão

Adotar **Supabase gerenciado** como backend do MVP, usando:

- **Supabase Auth** para trocar a credencial Google por uma sessão da aplicação;
- **Postgres** como fonte de verdade para perfis, papéis, turmas, vínculos e dados de aprendizagem;
- **grants e Row Level Security** como fronteira principal de autorização;
- **funções SQL/RPC** para operações transacionais que podem continuar submetidas à identidade e às políticas do usuário;
- **Edge Functions autenticadas** para provisionamento, integrações externas e operações que exijam uma chave secreta ou privilégio administrativo;
- **Supabase CLI e migrações SQL versionadas** para desenvolvimento, teste e promoção entre ambientes.

Não será criada uma API própria de autenticação (`/auth/google`, `/auth/refresh`) no MVP. Supabase Auth será responsável por validar a credencial do provedor e administrar access/refresh tokens. Uma API dedicada poderá ser adicionada sem trocar o banco se surgir necessidade comprovada.

### Fluxo de autenticação decidido

1. A pessoa toca em **Continuar com Google** no aplicativo.
2. A integração Google mobile obtém um ID token com nonce aleatório no fluxo
   `signInWithIdToken`; a validação permanece habilitada e
   `skip_nonce_check=true` é proibido. Qualquer fluxo alternativo precisa oferecer
   proteção equivalente contra replay e associação incorreta.
3. O aplicativo chama `supabase.auth.signInWithIdToken` para o provedor `google`, ou o fluxo OAuth/PKCE oficial equivalente quando a biblioteca mobile escolhida exigir navegador.
4. Supabase Auth valida a identidade Google e emite access token e refresh token da sessão Supabase.
5. O aplicativo consulta o contexto de acesso server-side: perfil, estado da conta, papéis ativos e vínculos de turma.
6. Sem vínculo ativo, a sessão não recebe acesso aos dados do domínio; o aplicativo encerra a sessão e mostra **Conta não cadastrada** ou **Acesso desativado**.
7. Com um único papel, o aplicativo abre o fluxo correspondente. Com mais de um papel, uma escolha pós-login mostra somente os papéis retornados pelo backend.

O papel recebido pelo cliente serve para apresentação e navegação. Toda leitura e escrita continua sendo autorizada por grants/RLS ou por uma função server-side.

Google permanece a opção de autenticação dos dois papéis. Para distribuição no
iOS, a [avaliação da App Review Guideline 4.8](../privacy/store-disclosures.md#login-no-ios)
trata Sign in with Apple como requisito até que se comprove a exceção estrita de
contas educacionais/empresariais gerenciadas. Um provedor Apple adicional não
altera a autorização por vínculo e contas nunca são mescladas apenas pelo e-mail.

### Identidade e provisionamento

`auth.users.id` será o identificador interno do usuário. A identidade Google e seu `sub` permanecem vinculados pelo Supabase Auth. E-mail será usado apenas para exibição e, se necessário, para reivindicar uma autorização previamente criada; não será usado como chave estrangeira permanente.

Modelo inicial implementado na primeira migração:

| Entidade | Responsabilidade | Regras essenciais |
| --- | --- | --- |
| `profiles`, `preferences` | Identidade de domínio e preferências pessoais | PK/FK para `auth.users.id`; usuário acessa somente seus campos editáveis. |
| `classes`, `memberships` | Turmas e papéis `participant`/`monitor` por turma | Vínculo ativo é a fonte de autorização; uma conta pode ter os dois papéis em contextos distintos. |
| `invitations` | Convites prévios por e-mail verificado | Persiste apenas hash do token, expiração e consumo; aceite será uma operação server-side. |
| `missions`, `mission_versions`, `mission_steps` | Catálogo e conteúdo versionado | Cliente autenticado lê somente missão ativa e versão publicada. |
| `class_mission_assignments` | Liberação de uma versão para uma turma | Somente monitor da turma gerencia; só versões publicadas são atribuíveis. |
| `attempts`, `attempt_events` | Execução e linha do tempo de aprendizagem | Participante escreve os próprios dados; monitor vinculado tem leitura. |
| `help_requests` | Pedido contextual de apoio | Participante cria o próprio pedido e monitor da turma o atende. |

O diagrama, o dicionário e a matriz de acesso estão em
[`docs/architecture/data-model.md`](../architecture/data-model.md).

Para o MVP, papéis não serão copiados para custom claims. As políticas consultarão relações server-side indexadas. Isso evita que uma revogação fique esperando a expiração de um JWT. Se medições mostrarem custo relevante, um Custom Access Token Hook poderá ser avaliado depois, acompanhado de TTL curto e estratégia explícita de invalidação.

### Regras de autorização invariantes

- `anon` não lê nem altera dados do domínio.
- Uma pessoa autenticada não insere, altera ou reativa seu próprio convite, papel ou vínculo de turma.
- Participante lê seu perfil, suas atribuições e suas tentativas; não lista outros participantes.
- Monitor lê participantes, atribuições e relatórios apenas das turmas em que tem vínculo ativo.
- Toda policy checa autenticação, status ativo e escopo de relacionamento; possuir um JWT válido não basta.
- Grants SQL e policies RLS são configurados em conjunto. Habilitar RLS sem revisar grants não é considerado suficiente.
- Acesso administrativo que ignora RLS só ocorre dentro de função server-side auditável.
- Funções `security definer`, se inevitáveis, terão `search_path` fixo, permissões mínimas e `EXECUTE` revogado de papéis públicos; a preferência é por execução com o contexto do usuário.

### Fronteiras de API

- Consultas e mutações simples podem usar `@supabase/supabase-js` diretamente com a chave publicável e o JWT do usuário, protegidas por RLS.
- Mudanças que precisam ser atômicas usam funções Postgres/RPC com contratos explícitos.
- Provisionar/revogar papel, consumir convite, administrar turma em nome de terceiros ou chamar serviço externo usa Edge Function autenticada.
- A chave secreta (`secret`/legada `service_role`) nunca é usada pelo aplicativo, por testes distribuídos ao usuário ou por uma função executada no contexto do cliente.
- Uma Edge Function chamada por usuário mantém validação JWT habilitada e, por padrão, opera com um cliente Supabase submetido à RLS. Elevação administrativa deve ser localizada e justificada.

## Segurança

### Ameaças e controles

| Ameaça | Controle decidido |
| --- | --- |
| Cliente troca `participant` por `monitor` no estado ou payload | RLS consulta `memberships`; papel enviado pelo cliente nunca é fonte de verdade. |
| Conta Google desconhecida entra no aplicativo | Sem vínculo/papel ativo, todas as tabelas permanecem deny-by-default; sessão é encerrada com erro funcional. |
| Chamada direta à Data API ignora a interface | A mesma RLS é executada para chamadas legítimas e clientes modificados. |
| Chave publicável é extraída do bundle | Ela não concede privilégios sozinha; grants mínimos e RLS são obrigatórios em todas as tabelas expostas. |
| Chave secreta vaza | Secrets ficam somente no Supabase/CI; nunca usam prefixo `EXPO_PUBLIC_`, não entram no Git nem em logs. Rotação e resposta a incidente devem ser documentadas. |
| Refresh token é copiado do aparelho ou de logs | Sessão é armazenada criptografada, tokens nunca são logados e a rotação/reuse detection do Supabase permanece habilitada. |
| Papel é revogado enquanto a sessão continua válida | Policies consultam relações ativas no banco; revogação bloqueia os dados sem depender de renovar custom claim. |
| Resposta Google é reproduzida ou associada ao fluxo errado | Nonce aleatório e validação do provedor; nunca aceitar perfil ou ID informado diretamente pelo cliente. |
| Deep link intercepta tokens | Preferir ID token nativo com `signInWithIdToken`; não transportar tokens de aplicação em deep links. Fallback browser usa PKCE e allowlist exata de callbacks. |
| Monitor tenta acessar outra turma por ID previsível | Policies verificam `memberships`, não apenas formato ou existência do ID. |

### Armazenamento da sessão no aparelho

No Android/iOS, a sessão não será persistida como texto aberto em AsyncStorage. A implementação usará um adapter de storage revisado para Expo:

- valores pequenos/chaves ficam no `expo-secure-store`, protegido pelo Android Keystore e iOS Keychain;
- como sessões serializadas podem ultrapassar limites históricos do SecureStore, a implementação deve testar o tamanho real e usar o padrão oficial para valores grandes: payload criptografado em storage comum e chave criptográfica no SecureStore, ou um adapter equivalente auditado;
- falhas de leitura, escrita, restauração de backup ou chave ausente invalidam a sessão local e levam a novo login, sem loop;
- no iOS, deve-se considerar que itens do Keychain podem sobreviver à reinstalação; logout e troca de conta precisam apagar explicitamente o material local;
- no Android, backups não podem restaurar ciphertext sem a chave correspondente;
- o refresh automático só roda enquanto o aplicativo está ativo, com exclusão mútua para evitar corrida de refresh.

No web, se o suporte autenticado for mantido, o armazenamento e o fluxo devem ser avaliados separadamente; SecureStore não existe nessa plataforma. Esta ADR não autoriza reutilizar a solução mobile de maneira insegura no navegador.

### Segredos e ambientes

Development usa a stack Supabase local. Staging e production usam projetos
remotos separados. No aplicativo, somente estes valores Supabase são públicos:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Client IDs OAuth também são identificadores públicos, não segredos. O Google client secret e chaves Supabase secret/service ficam no gerenciador de secrets do ambiente correspondente. Dados de produção não serão copiados para desenvolvimento sem anonimização.

Migrações, funções e policies devem ser versionadas e revisadas. Alterações de autorização exigem testes negativos antes da promoção. O acesso ao dashboard de produção deve usar MFA e menor privilégio.

### Dados pessoais e retenção

- Coletar somente nome, e-mail verificado, avatar opcional e dados necessários à aprendizagem/monitoramento.
- Não solicitar nem persistir Google access token para APIs que o produto não usa.
- Aplicar os prazos e rotinas definidos no
  [inventário de dados e retenção](../privacy/data-inventory.md), inclusive para
  contas sem vínculo, convites, tentativas, eventos, ajuda e auditoria.
- Implementar exportação, correção, revogação e exclusão conforme
  [direitos e operação](../privacy/rights-and-operations.md).
- Revisar região de hospedagem, DPA, backups e responsáveis pelo tratamento antes de usar dados reais.

A [política de privacidade](../privacy/privacy-policy.md), a
[matriz normativa de autorização e testes](../privacy/authorization-and-logging.md)
e o [mapeamento das lojas](../privacy/store-disclosures.md) são contratos
complementares aprovados na Issue #2. Eles registram também as diferenças entre
a fundação inicial e os controles que ainda bloqueiam production; esta ADR não
deve ser lida como afirmação de que a migração inicial já implementa exclusão ou
todos os cenários RLS.

## Consequências

### Positivas

- O MVP evita construir um servidor de identidade e uma implementação própria de refresh token.
- O banco relacional atende tanto às telas atuais quanto a relatórios e vínculos futuros.
- A autorização fica no servidor/banco e não depende da honestidade do aplicativo.
- Migrações SQL e Postgres reduzem o custo de uma migração futura do banco.
- O time pode desenvolver localmente e separar ambientes desde o início.

### Negativas

- RLS passa a ser parte crítica da aplicação e exige revisão especializada, índices e testes automatizados.
- O produto assume dependência operacional e comercial do Supabase.
- O login e os dados reais dependerão de rede; offline-first não faz parte do MVP.
- O fluxo Google mobile exige configuração nativa/development build e credenciais corretas para cada assinatura/plataforma.
- O armazenamento seguro de uma sessão completa é mais complexo do que salvar uma string em AsyncStorage.
- Contas Google sem autorização podem deixar registros técnicos em `auth.users` até a rotina de limpeza.

### Neutras ou operacionais

- O aplicativo deixa de ter uma escolha livre de papel antes do login.
- Uma pessoa com dois papéis verá uma escolha depois de autenticar, restrita ao retorno server-side.
- Mocks continuarão úteis para Storybook/testes isolados, mas não serão fonte de verdade em builds conectados.
- Edge Functions devem permanecer pequenas e idempotentes; processamento longo exigirá outro mecanismo no futuro.

## Validação da decisão

Antes de migrar dados reais, um spike deve comprovar em Android e iOS:

1. login Google e criação/restauração da sessão Supabase;
2. conta provisionada de participante e conta provisionada de monitor;
3. rejeição funcional de conta sem vínculo;
4. cliente adulterado incapaz de inserir/alterar `memberships`;
5. participante incapaz de ler outro participante;
6. monitor incapaz de ler turma sem vínculo;
7. revogação de papel bloqueando novas consultas sem aguardar renovar JWT;
8. logout, refresh, app em background e recuperação após storage inválido;
9. ausência de secret/service key e tokens no bundle e nos logs;
10. execução das mesmas migrations e testes RLS no ambiente local e no CI.

## Quando reconsiderar

Reavaliar esta ADR se ocorrer qualquer uma destas condições:

- requisitos contratuais de residência, soberania ou certificação de dados não atendidos pelo plano/região escolhidos;
- necessidade de operação offline com sincronização e resolução de conflitos como função central;
- volume ou padrão de consultas tornando Data API/RLS comprovadamente inadequado em custo ou latência;
- regras de negócio exigindo workflows longos, filas e integrações que justifiquem uma API dedicada;
- necessidade de SSO empresarial, multi-região ativa ou infraestrutura on-premises;
- custo total do Supabase superar uma alternativa após medição real.

Uma futura API própria deve reutilizar Postgres e as regras de domínio sempre que possível. A substituição do provedor de Auth exigirá um plano explícito de migração/revinculação de identidades.

## Itens deliberadamente fora desta ADR

- escolha final da biblioteca nativa para exibir o botão Google;
- implementação de Sign in with Apple e decisão sobre a exceção educacional da App Store;
- esquema de relatórios agregados, áudio e notificações;
- estratégia offline e cache de dados do domínio;
- desenho do painel administrativo que cria convites e vínculos.

## Referências oficiais consultadas

Acesso em 2026-08-23:

- [Supabase — Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase — Social Auth com Expo React Native](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — User sessions](https://supabase.com/docs/guides/auth/sessions)
- [Supabase — Securing Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Supabase — Environment variables e secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase — Pricing](https://supabase.com/pricing)
- [Supabase — Billing](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase — Desenvolvimento local](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase — Inicialização do cliente JavaScript com Expo SecureStore](https://supabase.com/docs/reference/javascript/initializing)
- [Expo — Using Google authentication](https://docs.expo.dev/guides/google-authentication/)
- [Expo — Authentication in Expo and React Native apps](https://docs.expo.dev/develop/authentication/)
- [Expo — SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Firebase — Custom claims e Security Rules](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firebase — Condições nas Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Firebase — Pricing](https://firebase.google.com/pricing)
