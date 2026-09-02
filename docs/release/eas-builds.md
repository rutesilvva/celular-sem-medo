# Builds EAS

O identificador Android e o bundle ID iOS são `br.com.celularsemmedo.app`; o scheme é `celularsemmedo`.

1. Instale e autentique a CLI: `npx eas-cli login`.
2. Cadastre no EAS, em cada ambiente, somente as variáveis públicas `EXPO_PUBLIC_APP_ENV`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e os client IDs OAuth da plataforma.
3. Cadastre credenciais e senhas como variáveis secretas sem `EXPO_PUBLIC_`. Elas nunca devem entrar no bundle.
4. Gere um development build com `npm run build:development`; use o perfil `development-simulator` para o simulador iOS.
5. Distribua a validação interna com `npm run build:preview` e gere artefatos de loja com `npm run build:production`.

Os perfis apontam, respectivamente, para os ambientes EAS `development`, `preview` e `production`. Antes de produção, valide callback Google com o app fechado, aberto e em background, e confirme fingerprints Android e URL scheme iOS no Google Cloud.
