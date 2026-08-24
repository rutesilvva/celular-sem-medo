# Segurança das dependências

O projeto usa o Expo SDK 57 e bloqueia vulnerabilidades de severidade moderada
ou superior com `npm run audit`. Não use `npm audit fix --force`: essa opção pode
trocar o SDK e o React Native por versões incompatíveis.

## Override de `uuid`

O `@expo/config-plugins` depende de `xcode@3.0.1`, que por sua vez declara
`uuid@^7.0.3`. Essa faixa é afetada pelo advisory `GHSA-w5hq-g745-h8pq`.
Enquanto o pacote upstream não atualizar a dependência, `package.json` limita o
override ao caminho abaixo:

```text
@expo/config-plugins → xcode → uuid@11.1.1
```

O parser `xcode` chama apenas `uuid.v4()`. Essa API continua disponível na
versão 11.1.1, que contém o backport oficial da correção. O override não altera
outras dependências que eventualmente usem `uuid`.

Ao atualizar Expo ou `xcode`:

1. remova temporariamente o override;
2. execute `npm install` e `npm ls xcode uuid`;
3. mantenha-o removido somente se a árvore já resolver uma versão corrigida;
4. valide `npm run audit`, `npx expo-doctor`, lint, tipos e exportação;
5. valide a geração dos projetos nativos, pois o pacote `xcode` é usado durante
   a configuração do iOS.

Referências:

- [Advisory GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
- [Release do uuid 11.1.1](https://github.com/uuidjs/uuid/releases/tag/v11.1.1)
