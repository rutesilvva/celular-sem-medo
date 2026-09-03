# Testes automatizados e quality gate

## Suíte local

```bash
npm test
npm run test:ci
npm run typecheck
npm run lint
npm run export
```

`test:ci` aplica cobertura global mínima de 70% sobre as regras críticas em
`src`: autenticação e restauração, autorização por papel, preferências, executor
de missões, ambiente público e integração Google. Fórmulas de progresso, RLS,
convites, reenvio e isolamento entre turmas são exercitados pelos testes pgTAP:

```bash
npm run backend:reset
npm run backend:test
npm run backend:test:auth
```

Os testes Google usam somente mocks. Não precisam de conta, client secret ou
conectividade com o Google e cobrem sucesso, cancelamento, acesso negado, falta
de configuração, conta sem vínculo, conta bloqueada, expiração e indisponibilidade.

O `.npmrc` mantém `npm install` e `npm ci` com a mesma resolução de peers. Isso
é necessário enquanto os peers opcionais de `expo-modules-core` e
`react-native-worklets` do Expo 57 publicam intervalos incompatíveis entre si.

## Pull requests

`.github/workflows/quality.yml` executa três checks independentes:

- aplicação: instalação reproduzível, lint, TypeScript, Jest com cobertura,
  export Android/iOS/web e auditoria de dependências;
- banco: reset por migrations, lint, pgTAP e rotação/revogação de sessão;
- segurança: varredura do histórico com Gitleaks.

No GitHub, configure `Settings → Rules → Rulesets` para a branch `main`, exija
pull request e marque os três checks como obrigatórios. Essa configuração é uma
regra administrativa do repositório e não fica dentro do commit.

## Smoke E2E

Os fluxos `.maestro/participant-smoke.yaml` e `.maestro/admin-smoke.yaml`
rodam em Android e iOS sobre um development/preview build de staging. Eles
pressupõem duas instalações ou sessões já autenticadas com as contas sintéticas
de cada papel; não armazenam senha nem automatizam a interface externa do Google.

```bash
npm run e2e:smoke
npm run e2e:regression
```

Depois da conclusão da issue #3, execute ambos em Android e iOS e anexe os
relatórios ao release de staging. Falhas de login são cobertas deterministicamente
por Jest; o smoke valida navegação, missão, progresso e painel no binário real.
`role-guard.yaml` cobre o deep link administrativo com uma sessão de aluno e
`offline-recovery.yaml` confirma que a fila local continua consultável. Esses
cenários não substituem a evidência manual de Google, notificações e leitores de tela.
