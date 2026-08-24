# Google OAuth por plataforma e ambiente

Status: integração implementada no app; cadastro externo e smoke tests aguardam
os projetos Google/Supabase e as contas de teste.

## Contrato do fluxo

Participante, monitor e administrador usam o mesmo botão **Continuar com Google**.
O navegador seguro abre o consentimento, retorna ao aplicativo e o Supabase troca
o código PKCE por uma sessão. Só então `get_my_access_roles()` devolve os papéis
autorizados; o cliente nunca cria papel.

- Android package e iOS bundle ID: `br.com.celularsemmedo.app`
- scheme: `celularsemmedo`
- callback mobile: `celularsemmedo://auth/callback`
- callback web: `https://<host-do-ambiente>/auth/callback`
- callback Google → Supabase: `https://<project-ref>.supabase.co/auth/v1/callback`
- escopos: `openid email profile`

O app usa `expo-web-browser`, PKCE e `expo-secure-store`. Expo Go não é alvo de
homologação; Android/iOS precisam de development build ou binário EAS.

## Comportamento do cliente

- A web navega para o Google e a rota `/auth/callback` troca o código PKCE uma
  única vez. No mobile, o navegador seguro retorna pelo scheme e a própria ação
  conclui a troca.
- Um lock imediato, além do estado visual desabilitado, impede autenticações
  paralelas causadas por toques repetidos.
- Cancelamento, acesso negado, falta de conexão, conta não cadastrada, conta
  bloqueada, configuração inválida e falha temporária possuem mensagens distintas
  e permitem nova tentativa sem reiniciar o aplicativo.
- Nome, e-mail e foto são carregados da sessão/perfil autenticado. Sem foto, a
  interface mostra iniciais com descrição acessível.
- O cliente aceita somente papéis presentes em `get_my_auth_context()`. Com um
  papel, segue diretamente ao fluxo correspondente; com mais de um, mostra um
  seletor pós-login restrito à lista devolvida pelo servidor.
- Participante com onboarding concluído vai ao início. Caso contrário, vê as
  boas-vindas e a conclusão é persistida em `preferences`.

## Clientes no Google Auth Platform

Crie um projeto Google isolado por ambiente remoto. Em cada projeto:

1. Configure Branding, Audience e Data Access com nome, suporte, domínio,
   política de privacidade e apenas `openid`, `email`, `profile`.
2. Crie um cliente **Web application**. Cadastre a origem HTTPS e o callback do
   Supabase. Registre ID e secret no provedor Google do Supabase; o secret nunca
   vai para EAS ou para o bundle.
3. Crie clientes **Android** com package `br.com.celularsemmedo.app` para cada
   certificado aplicável. Google diferencia pelo par package + SHA-1.
4. Crie um cliente **iOS** com bundle ID `br.com.celularsemmedo.app`.
5. No Supabase Auth, permita exatamente os callbacks mobile e web do ambiente.
   Não use curingas em production.

## Matriz a preencher com valores reais

| Ambiente | Web origin | Callback Supabase no Google | Android SHA-1 | iOS bundle | Callbacks permitidos no Supabase |
| --- | --- | --- | --- | --- | --- |
| Development | `http://127.0.0.1:8081` | callback local/remoto usado no teste | debug local e development build EAS | ID fixo acima | scheme mobile; URL local `/auth/callback` |
| Staging | `<STAGING_WEB_ORIGIN>` | `https://<STAGING_REF>.supabase.co/auth/v1/callback` | preview/development build EAS | ID fixo acima | scheme mobile; `<STAGING_WEB_ORIGIN>/auth/callback` |
| Production | `<PRODUCTION_WEB_ORIGIN>` | `https://<PRODUCTION_REF>.supabase.co/auth/v1/callback` | upload key e Play App Signing key | ID fixo acima | scheme mobile; `<PRODUCTION_WEB_ORIGIN>/auth/callback` |

Obtenha fingerprints de build com `eas credentials -p android`. Depois que o app
existir no Play Console, registre também o certificado **App signing** em Release
> Setup > App Integrity. Não copie SHA-1 entre ambientes sem provar que é o mesmo
certificado.

## Variáveis, segredos e rotação

Client IDs são públicos. Configure os três IDs `EXPO_PUBLIC_GOOGLE_AUTH_*` e os
valores públicos do Supabase no EAS Environment correspondente. O app valida
ambiente, URL e chave antes do login.

O Google web client secret vive apenas no Supabase. Tokens pessoais, senha do
banco, `service_role` e secret Google nunca recebem prefixo `EXPO_PUBLIC_`, nunca
entram no Git e nunca são impressos em logs.

Rotação do secret Google:

1. criar um novo secret e armazená-lo no Supabase do ambiente;
2. validar login com as contas sintéticas e os três estados do app;
3. revogar o secret anterior;
4. registrar ambiente, responsável, data e resultado, nunca o valor;
5. em exposição, revogar imediatamente e seguir o processo de incidente.

## Development builds

Os perfis estão em `eas.json`:

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

Mudanças em scheme, plugins ou credenciais nativas exigem novo binário; uma
atualização JavaScript não altera configuração nativa.

## Roteiro de aceite

Execute por plataforma e ambiente suportado:

1. App aberto: consentir e confirmar retorno e papel correto.
2. App em background: alternar de app durante o consentimento e confirmar
   retomada sem sessão duplicada.
3. App encerrado: abrir callback válido e confirmar inicialização na rota de
   callback; repetir login para comprovar recuperação PKCE.
4. Cancelar e negar acesso: mensagem tratável e nenhuma sessão parcial.
5. Usar redirect/client incorreto em build descartável: erro tratável, sem loop.
6. Usar conta sem vínculo: mensagem de acesso indisponível e logout.
7. Inspecionar bundles: nenhum client secret, `service_role`, refresh token ou
   credencial de conta de teste.

Staging deve possuir duas contas Google sintéticas, uma com vínculo `participant`
e outra `monitor`. Senhas não entram em Git, issues ou documentação; ficam no
cofre da equipe com MFA e recuperação controlada.

## Pendências externas para fechar o aceite

- preencher refs, origins, client IDs e fingerprints reais;
- habilitar Google nos Supabase de staging e production;
- criar e provisionar as duas contas sintéticas de staging;
- executar e registrar a matriz em Android, iOS e navegador.

Sem acesso a Google Cloud, Supabase remoto, EAS e lojas, o repositório não produz
essas evidências sozinho.
