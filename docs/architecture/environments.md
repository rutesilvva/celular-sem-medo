# Arquitetura de ambientes

Status: contrato operacional proposto para o MVP.

O Celular Sem Medo deve manter development, staging e production isolados. A promoção ocorre por código, migrações e configuração revisados; dados reais nunca são promovidos ou copiados para ambientes inferiores.

## Visão geral

| Dimensão | Development | Staging | Production |
| --- | --- | --- | --- |
| Objetivo | Desenvolvimento local e testes rápidos | Homologação semelhante à produção | Uso real |
| Aplicativo | Expo local/development build | Build preview ou candidato | Build assinado de loja |
| Supabase | Stack Docker local | Projeto remoto exclusivo | Projeto remoto exclusivo |
| Dados | Fixtures sintéticas | Fixtures e contas de teste controladas | Dados reais mínimos |
| Google OAuth | Opcional local; preferir staging em aparelho | Clientes OAuth de staging | Clientes OAuth de produção |
| Observabilidade | Console sanitizado | Projeto/dataset de staging | Projeto/dataset de produção |
| Deploy | Máquina local | Automático após merge em `main` | Aprovação manual a partir de release imutável |
| SLA | Nenhum | Interno | Definido pelo produto e fornecedores |

## Identidade do aplicativo

Todos os builds usam a identidade já reservada: package e bundle ID
`br.com.celularsemmedo.app` e scheme `celularsemmedo`. Os ambientes são isolados
por projeto Supabase, projeto/cliente Google e EAS Environment. Builds de
ambientes diferentes não coexistem no mesmo aparelho com essa identidade.

O `app.config.ts` é a fonte de configuração nativa. A build recebe
explicitamente `EXPO_PUBLIC_APP_ENV` e os endpoints do próprio ambiente, sem
fallback de staging para production.

## Fronteiras de confiança

```text
Aplicativo mobile
  ├─ chave publicável do Supabase
  ├─ sessão do usuário em armazenamento seguro
  └─ dados permitidos por JWT + RLS

Supabase Auth / Postgres / Edge Functions
  ├─ client secret do Google
  ├─ service/secret key somente no servidor
  ├─ papel e vínculo com turma
  └─ auditoria e políticas de acesso
```

O aplicativo não é uma fronteira de segurança. Trocar parâmetros, abrir deep links ou alterar o estado local jamais pode conceder papel de monitor ou acesso a outro participante.

## Contrato de autenticação e autorização

- participante e monitor têm Google como opção de autenticação; a build iOS de
  production também oferece Apple se a exceção estrita da loja não for comprovada;
- o cliente solicita apenas identidade básica;
- o backend resolve o papel usando cadastro, convite ou vínculo administrativo;
- uma conta sem papel válido recebe estado de acesso pendente, não escolhe livremente o perfil;
- toda tabela com dados de usuário ou turma habilita RLS;
- o monitor acessa apenas turmas às quais está vinculado;
- o participante acessa somente o próprio progresso;
- operações administrativas usam Edge Function ou backend confiável;
- service/secret key nunca é usada no aplicativo.

## Variáveis públicas do cliente

| Variável | Finalidade | Observação |
| --- | --- | --- |
| `EXPO_PUBLIC_APP_ENV` | Seleciona `development`, `staging` ou `production` | Validar em tempo de build |
| `EXPO_PUBLIC_SUPABASE_URL` | Endpoint do projeto do ambiente | Pública, mas não compartilhada entre ambientes |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável do projeto | Segurança depende de RLS |
| `EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID` | Identidade OAuth web, se o fluxo escolhido exigir | Não é secret |
| `EXPO_PUBLIC_GOOGLE_AUTH_ANDROID_CLIENT_ID` | Cliente Android do ambiente | Não é secret; package fixo e fingerprints próprios |
| `EXPO_PUBLIC_GOOGLE_AUTH_IOS_CLIENT_ID` | Cliente iOS do ambiente | Não é secret; bundle ID fixo |
| `EXPO_PUBLIC_SENTRY_DSN` | Destino de erros, se Sentry for adotado | Configurar scrubbing e ambiente |

O código deve validar presença, formato e combinação dessas variáveis ao iniciar. Uma build de production deve falhar se apontar para Supabase, Google ou observabilidade de outro ambiente.

Os nomes de eventuais client IDs nativos de iOS e Android serão definidos junto da biblioteca/config plugin escolhida; eles não fazem parte do contrato mínimo atual.

## Segredos

| Segredo | Onde vive | Consumidor |
| --- | --- | --- |
| Google OAuth client secret | Supabase secret store; variável local apenas quando necessário | Supabase Auth |
| Supabase service/secret key | Secret store de função/CI | Edge Functions e tarefas administrativas |
| Senha do Postgres | Supabase e CI protegido | Pipeline de migração |
| `SUPABASE_ACCESS_TOKEN` | Secret store do CI | Supabase CLI |
| `EXPO_TOKEN` | Secret store do CI | EAS Build/Submit |
| `SENTRY_AUTH_TOKEN` | Secret store do CI | Upload de source maps |
| Credenciais Google Play | EAS/secret store | Submit Android |
| Credenciais App Store Connect | EAS/secret store | Submit iOS |

Regras obrigatórias:

- nunca usar prefixo `EXPO_PUBLIC_` em segredo;
- nunca colocar valores reais em `app.json`, `eas.json`, TOML, documentação ou fixtures;
- mascarar segredos nos logs;
- aplicar menor privilégio e separar credenciais por ambiente;
- registrar proprietário, finalidade e data de rotação;
- revogar imediatamente qualquer segredo exposto.

## Fonte de configuração

| Contexto | Fonte |
| --- | --- |
| Development local | `.env.local` ignorado pelo Git e saída do `supabase status` |
| Supabase local | `supabase/config.toml` versionado + variáveis do shell para segredos |
| Build preview | EAS Environment `preview`/`staging` |
| Build de produção | EAS Environment `production` |
| Migrações remotas | Secrets e environments protegidos no CI |
| Edge Functions | Supabase secrets do projeto correspondente |

Não use fallback de staging para production nem valores de produção como padrão. Ausência de configuração deve interromper build ou inicialização com erro claro.

## Banco, migrações e RLS

`supabase/migrations/` é a fonte de verdade do schema. Alterações manuais pelo Dashboard precisam ser transformadas em migração antes de qualquer promoção.

Cada pull request que muda o banco deve incluir:

- migração forward-only;
- políticas RLS e grants explícitos;
- teste positivo e negativo para participante e monitor;
- tipos TypeScript regenerados;
- nota de impacto, tempo estimado e plano de recuperação para mudanças destrutivas.

Promoção:

1. reset completo do banco local;
2. revisão e testes no pull request;
3. `db push --dry-run` em staging;
4. aplicação e smoke test em staging;
5. backup ou ponto de recuperação confirmado em produção;
6. aprovação manual;
7. aplicação do mesmo conjunto de migrações em produção;
8. smoke test e observação de erros.

Não edite migrações que já chegaram a staging. Não use `db reset --linked` em ambientes remotos.

## Seeds e dados

| Ambiente | Política de seed |
| --- | --- |
| Development | Catálogo determinístico e sintético; identidades de teste são provisionadas separadamente |
| Staging | Fixtures próprias e contas Google controladas |
| Production | Sem seed de demonstração; apenas catálogo/configuração revisados |

É proibido copiar dump de produção para development ou staging. Caso um incidente exija reprodução, crie um fixture mínimo anonimizado e documente sua revisão.

Dados potencialmente tratados pelo produto incluem identidade, e-mail, papel, vínculo com turma, progresso, tentativas e uso de ajuda. Áudio, fotos, localização e conteúdo de simulações não devem sair do dispositivo enquanto não houver finalidade, base legal, retenção e controles aprovados.

## Builds e canais

Perfis EAS esperados:

- `development`: development client e distribuição interna;
- `preview`: staging, distribuição interna e configuração semelhante à produção;
- `production`: binário de loja com incremento de versão.

Atualizações OTA, se adotadas, precisam de `runtimeVersion` compatível e canais separados. Uma atualização de staging nunca pode alcançar production. Mudanças nativas, de schema incompatível ou de autenticação exigem nova build e estratégia de compatibilidade.

## Promoção e rollback

O artefato promovido deve ser identificado por commit, versão e build number. Não reconstrua código diferente sob a mesma versão.

Ordem recomendada:

```text
pull request → checks → main → staging → smoke test
→ release aprovada → migração production → build/submit → observação
```

Rollback do aplicativo pode usar uma versão anterior ou OTA compatível. Rollback de banco deve preferir migração corretiva; down migration destrutiva exige avaliação, backup verificado e aprovação explícita. Features que dependem de schema novo devem tolerar a janela de implantação ou ficar atrás de feature flag.

## Limites por ambiente

### Development

- sem dados reais;
- sem exposição pública da stack local;
- e-mails ficam no servidor local de captura;
- logs detalhados permitidos somente sem tokens ou PII;
- indisponibilidade e perda de dados locais são aceitáveis.

### Staging

- acesso limitado à equipe e testadores autorizados;
- nenhum uso operacional por participantes reais;
- integrações externas em sandbox ou contas de teste;
- alertas separados e retenção curta;
- pode ser resetado mediante comunicação.

### Production

- acesso administrativo com MFA e menor privilégio;
- backups, monitoramento, retenção e resposta a incidentes definidos;
- logs e analytics sanitizados;
- mudanças auditáveis e aprovadas;
- exclusão e exportação de dados atendem à política de privacidade.

Production não recebe pessoas reais enquanto houver bloqueio no
[checklist de privacidade](../privacy/README.md#bloqueios-para-tratar-dados-reais).
O projeto deve configurar os prazos do
[inventário de retenção](../privacy/data-inventory.md), inclusive sessão, logs,
jobs de expiração e janela máxima de backup.

## Checklist de criação de ambiente remoto

- [ ] Projeto Supabase exclusivo criado na região aprovada.
- [ ] URLs e chave publicável registradas no environment correto.
- [ ] Google OAuth configurado com clientes e redirects do ambiente.
- [ ] RLS habilitada e testes de isolamento aprovados.
- [ ] Contas de teste e vínculos de papel criados sem dados reais.
- [ ] Secrets armazenados fora do Git.
- [ ] Observabilidade aponta para projeto/dataset correto.
- [ ] Migrações aplicadas pelo pipeline.
- [ ] Login, logout, expiração e negação de acesso validados.
- [ ] Responsável e procedimento de rotação documentados.
- [ ] Controlador, canal de privacidade e papel das instituições definidos.
- [ ] DPA, subprocessadores, países e mecanismo de transferência registrados.
- [ ] Exclusão, exportação, revogação global e jobs de retenção testados.
- [ ] Formulários Data Safety/App Privacy conferidos contra o binário final.
- [ ] Requisito da App Review Guideline 4.8 resolvido para o login no iOS.

## Referências

- [Supabase: desenvolvimento local](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase: gerenciamento de configuração e segredos](https://supabase.com/docs/guides/local-development/managing-config)
- [Supabase: Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Expo: variáveis de ambiente](https://docs.expo.dev/guides/environment-variables/)
- [Expo: perfis EAS](https://docs.expo.dev/build/eas-json/)
