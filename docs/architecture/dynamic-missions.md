# Missões dinâmicas seguras

## Arquitetura

Toda definição, independentemente da origem futura, usa a mesma fronteira:

```text
JSON desconhecido
  → validateMissionSchema
  → validateMissionSafety
  → validateMissionReferences
  → MissionDefinition validada
  → Mission Runtime
  → SafeMissionRenderer
  → componentRegistry fechado
```

O JSON nunca escolhe módulos React, funções, rotas, estilos, URLs ou APIs. Ele só
seleciona literais presentes nas allowlists. Uma definição inválida não é
renderizada parcialmente: `loadDynamicMission` devolve a missão local de fallback.

## Schema 1.0

`MissionDefinition` contém identidade, categoria, dificuldade, duração, nível de
segurança, passo inicial e passos. Cada passo contém componentes e ações como
uniões discriminadas. Os limites defensivos ficam centralizados em
`src/features/dynamic-missions/limits.ts`. Versões diferentes de `1.0` são
rejeitadas, sem migração silenciosa.

Exemplo mínimo válido:

```json
{
  "schemaVersion": "1.0",
  "id": "local-example",
  "title": "Treino simples",
  "description": "Aprenda em ambiente fictício.",
  "category": "Primeiros passos",
  "difficulty": "easy",
  "estimatedDuration": 2,
  "safetyLevel": "standard",
  "initialStepId": "start",
  "metadata": { "source": "local", "educationalOnly": true },
  "steps": [{
    "id": "start",
    "components": [
      { "id": "copy", "type": "info", "text": "Nenhuma ação real acontece." },
      { "id": "finish", "type": "button", "label": "Concluir", "buttonActionId": "complete" }
    ],
    "actions": [{ "id": "complete", "type": "completeMission" }]
  }]
}
```

## Componentes e ações permitidos

As listas canônicas `COMPONENT_TYPES` e `ACTION_TYPES` ficam em `types.ts`. O
registry contempla textos, títulos, informações, busca e inputs controlados,
listas, escolhas, checkbox, botões, assets locais, player fictício, resultados,
chat, mensagens, loja, produtos, carrinho, formulário, alertas, confirmação,
teclado, progresso, dicas, feedback, educação e segurança contra golpes.

As ações permitem somente alterações no runtime local: navegar entre passos,
alterar inputs/seleções, abrir confirmação, mostrar dica, controlar vídeo
fictício, alterar carrinho fictício, confirmar ação fictícia e concluir.

## Segurança

- Propriedades desconhecidas, inclusive `style`, `componentName`, callbacks e
  imports, são rejeitadas.
- HTML, scripts, JavaScript, URLs, deep links e código executável são bloqueados.
- Assets são resolvidos exclusivamente por `AllowedAssetId` local.
- Solicitações de senha, PIN, CVV, token, código SMS e dados reais são bloqueadas.
- Pagamento, Pix, mensagens, câmera e GPS reais não são executáveis.
- Temas sensíveis exigem `safetyLevel: sensitive` e `educationalOnly: true`.
- IDs duplicados, alvos inexistentes e ciclos de navegação são rejeitados.
- O runtime aceita apenas `MissionAction`; componentes visuais não contêm lógica
  de negócio importante.

## Criar uma missão

1. Crie uma definição tipada em `fixtures/`.
2. Use apenas os tipos e assets listados em `types.ts`.
3. Passe a definição por `validateMission` ou `loadDynamicMission`.
4. Adicione testes de fluxo, referências e segurança.
5. Renderize somente o `mission` devolvido pelo loader.

As referências completas são `videoMission.ts` e `fallbackMission.ts`.

## Adicionar componente ou versão

Para adicionar componente, inclua o literal em `ComponentType` e
`COMPONENT_TYPES`, defina somente propriedades seguras no tipo, registre um
renderer explícito em `componentRegistry` e adicione testes. Não existe fallback
visual para tipo desconhecido.

Para uma nova versão, crie tipos e validador próprios e faça o roteamento explícito
em `validateMissionByVersion`. Nunca trate uma versão incompatível como `1.0`.

## Preparação para IA

Uma integração futura deverá chamar `validateMission(rawMission)` antes de salvar,
revisar ou renderizar. A chave e a chamada do modelo não pertencem a esta entrega.
IA, Supabase, administrador, arquivo e fixture não podem contornar o pipeline.

## Demonstração e testes

Habilite o modo de apresentação fora de produção e, na tela de demonstração,
selecione **Assistir e buscar vídeos** ou **Abrir fallback**. Ambas funcionam sem
autenticação, internet, banco ou API.

```bash
npm run typecheck
npm run lint
npm run test:ci
npm run export
```
