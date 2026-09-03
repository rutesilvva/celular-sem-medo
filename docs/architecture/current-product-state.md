# Estado atual do produto

Atualizado em 3 de setembro de 2026. Este documento distingue código entregue,
demonstração controlada e homologação externa.

## Implementado no repositório

- aplicativo Expo/React Native com rotas protegidas para `participant` e `admin`;
- Google OAuth via Supabase, sessão persistente e logout local resiliente;
- perfis, turmas, vínculos, convites e administração global protegidos por RLS/RPC;
- catálogo versionado, executor seguro, tentativas, progresso e sincronização offline;
- confiança antes/depois, recomendações explicáveis, demandas de aprendizagem,
  missões contra golpes, TTS, ajuda, oficina, impacto e exportação;
- quality gate com lint, tipos, Jest, pgTAP, export e varredura de segredos.

Dados sintéticos aparecem somente em seeds, testes e no modo demonstração
explicitamente habilitado. A visão geral administrativa consulta RPCs reais e não
apresenta contagens fixas como se fossem produção.

## Homologação ainda necessária

- concluir clientes Google, redirects e fingerprints da issue #3;
- executar Maestro, TalkBack, VoiceOver, push, compartilhamento e OAuth em Android
  e iOS físicos;
- conectar o transporte de observabilidade e validar source maps/alertas;
- gerar builds EAS assinados e finalizar materiais e declarações das lojas;
- realizar sessões com pessoas idosas e registrar evidência, sem inventar métricas.

## Papéis e autorização

Existem somente `participant` (aluno) e `admin` (administrador global). Pode haver
mais de um administrador, mas o servidor impede remover o último ativo. O Google
comprova identidade; concessões persistidas e verificadas no servidor definem
acesso. Documentação anterior sobre `monitor` descreve um desenho substituído pela
migração da issue #23 e não deve orientar implementação nova.

## Demonstração

O localhost não ativa demonstração. O modo local sintético exige
`EXPO_PUBLIC_DEMO_MODE=true`, funciona apenas fora de production e é identificado
na interface. `EXPO_PUBLIC_ENABLE_DEVELOPMENT_MOCKS` permanece reservado a
fixtures de desenvolvimento e não autoriza dados falsos em superfícies conectadas.
