# Builds EAS

O identificador Android e o bundle ID iOS são `br.com.celularsemmedo.app`; o scheme é `celularsemmedo`.

1. Instale e autentique a CLI: `npx eas-cli login`.
2. Cadastre no EAS, em cada ambiente, somente as variáveis públicas `EXPO_PUBLIC_APP_ENV`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e os client IDs OAuth da plataforma.
3. Cadastre credenciais e senhas como variáveis secretas sem `EXPO_PUBLIC_`. Elas nunca devem entrar no bundle.
4. Gere um development build com `npm run build:development`; use o perfil `development-simulator` para o simulador iOS.
5. Distribua a validação interna com `npm run build:preview` e gere artefatos de loja com `npm run build:production`.

Os perfis apontam, respectivamente, para os ambientes EAS `development`, `preview` e `production`. Antes de produção, valide callback Google com o app fechado, aberto e em background, e confirme fingerprints Android e URL scheme iOS no Google Cloud.

## Checklist de promoção

1. A árvore Git deve estar limpa e os testes, typecheck, lint e Expo Doctor devem passar.
   Execute `npm run release:check`; no CI de cada ambiente use `RELEASE_ENV=staging npm run release:check` ou `RELEASE_ENV=production npm run release:check` para exigir as variáveis correspondentes sem imprimir seus valores.
2. Rode `npm run build:preview:android` e `npm run build:preview:ios` e instale ambos em aparelhos limpos.
3. Valide login, logout, sessão expirada, aluno, administrador, modo avião, TTS, microfone negado e deep link de ajuda.
4. Registre commit, números dos builds, backend e clientes OAuth usados.
5. Só então rode `npm run build:production`; a submissão usa `npm run submit:production` e exige aprovação humana.

## Atualizações e rollback

`runtimeVersion` segue a versão do aplicativo; mudanças nativas, autenticação ou schema incompatível exigem uma nova build. Atualizações JavaScript de preview usam `npm run update:preview`. Produção usa `npm run update:production` somente depois da mesma validação e aprovação da build.

Para rollback, selecione no painel EAS uma atualização anterior da mesma runtime ou publique novamente o bundle previamente aprovado. Banco não recebe down migration destrutiva: use migração corretiva e mantenha funcionalidades novas sob flag durante a janela de implantação.

Credenciais Apple, Google Play, Expo e chaves privadas ficam no EAS/CI. `EXPO_PUBLIC_*` pode conter apenas identificadores e configurações públicas.
