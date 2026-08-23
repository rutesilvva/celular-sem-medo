# Celular Sem Medo

Base mobile navegável para uma plataforma de letramento digital voltada a pessoas idosas. O produto reúne uma experiência de prática segura para participantes e uma visão de acompanhamento para monitores.

Esta entrega é um protótipo funcional em Expo/React Native: os fluxos principais, estados de interface e feedbacks estão implementados com dados locais, sem backend ou integrações reais.

## Visão do produto

O Celular Sem Medo ajuda uma pessoa a praticar tarefas do dia a dia — como enviar uma foto, conferir um Pix ou compartilhar a localização — em um ambiente que deixa claro que nenhuma ação real será executada. Quando surge uma dificuldade, a interface oferece explicação em áudio, indicação visual e uma nova tentativa.

Para o monitor, o aplicativo organiza o progresso da turma, o uso dos recursos de apoio e as dificuldades mais recorrentes. O objetivo desta base é tornar essa história demonstrável de ponta a ponta em um celular.

## Stack

- Expo SDK 54 e React Native 0.81;
- React 19 e TypeScript em modo estrito;
- Expo Router para navegação baseada em arquivos;
- `@expo/vector-icons` para a iconografia;
- `react-native-safe-area-context` para respeitar as áreas seguras do aparelho.

A marca oficial está empacotada localmente em `assets/`, sem depender de rede para aparecer na splash, no login e nas telas de apoio.

O projeto é mobile-first, em orientação retrato e com tema claro. A versão web existe como apoio para desenvolvimento e revisão visual.

## Fluxos implementados

### Entrada

1. A tela de abertura apresenta a marca e avança automaticamente para o login; também é possível tocar para continuar.
2. O login permite alternar entre **Participante** e **Monitor**.
3. Os campos vêm preenchidos para facilitar a demonstração. Não há validação de credenciais nesta versão.

### Participante

O fluxo principal demonstra a jornada de aprender, praticar, pedir ajuda e acompanhar a própria evolução:

```text
Boas-vindas → Acessibilidade → Início → Missões → Detalhes da missão
→ Simulador seguro → Dificuldade/Ajuda → Resultado → Progresso
```

A barra inferior mantém acesso a **Início**, **Missões**, **Progresso** e **Perfil**. As telas cobrem:

- introdução aos princípios de prática segura, passo a passo e apoio em áudio;
- preferências de acessibilidade e estados ligados/desligados;
- resumo do progresso e missão recomendada;
- grade de áreas de aprendizagem com progresso por tema;
- catálogo e detalhe de missões;
- simulação guiada de uma tarefa, sem envio de dados reais;
- caminho de dificuldade, orientação e nova tentativa;
- resultado da missão, evolução e perfil/configurações.

### Monitor

O monitor entra diretamente na visão da turma e pode percorrer:

```text
Visão geral → Participantes → Detalhes do participante
→ Missões → Relatórios → Perfil
```

A barra inferior possui cinco destinos: **Visão geral**, **Participantes**, **Missões**, **Relatórios** e **Perfil**. O fluxo apresenta indicadores da turma, participantes que precisam de atenção, conclusão das missões, uso de apoio em áudio, gráfico temporal e um resumo demonstrativo de relatórios.

## Estrutura do projeto

```text
assets/                 # Marca oficial e ícone do aplicativo
app/
├── _layout.tsx          # Providers, stack raiz, transições e status bar
├── index.tsx            # Splash
├── login.tsx            # Entrada e escolha de perfil
├── participant/         # Jornada e navegação do participante
└── monitor/             # Painel e navegação do monitor

src/
├── components/          # Shell de tela, navegação, feedback e UI reutilizável
├── context/             # Estado efêmero de perfil, preferências e avisos
├── data/                # Participantes, missões e métricas mockadas
└── theme/               # Cores, tipografia, espaçamento, raios e sombras
```

As rotas ficam em `app/`, seguindo as convenções do Expo Router. Regras visuais e componentes compartilhados ficam em `src/` para evitar que cada tela replique estilos e comportamentos.

## Pré-requisitos

- Node.js 20 LTS;
- npm 10 ou superior;
- para dispositivo físico, Expo Go compatível com o SDK 54;
- opcionalmente, Android Studio para emulador Android;
- opcionalmente, macOS com Xcode para simulador iOS.

## Instalação

Na raiz do projeto:

```bash
npm install
npm run start
```

O Expo exibirá um QR code e os atalhos disponíveis. No dispositivo físico, mantenha o computador e o celular na mesma rede e leia o QR code pelo Expo Go.

Se o Metro estiver com cache antigo, use:

```bash
npx expo start --clear
```

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm run start` | Inicia o servidor de desenvolvimento do Expo. |
| `npm run android` | Abre o projeto em um dispositivo ou emulador Android. |
| `npm run ios` | Abre o projeto no simulador iOS; requer macOS e Xcode. |
| `npm run web` | Inicia a versão web para apoio à revisão visual. |
| `npm run export` | Gera os bundles de Android, iOS e web. |
| `npm run lint` | Executa as regras do ESLint/Expo. |
| `npm run typecheck` | Valida os tipos TypeScript sem gerar arquivos. |

## Como testar a demonstração

### Participante

1. Aguarde a splash ou toque nela para abrir o login.
2. Mantenha **Participante** selecionado e toque em **Entrar como participante**.
3. Avance pelas boas-vindas e configure as preferências de acessibilidade.
4. Na tela inicial, abra a missão recomendada ou use a aba **Missões**.
5. Entre nos detalhes, inicie o treino e percorra o simulador.
6. Acione os recursos de áudio e o caminho de ajuda para conferir o feedback visual.
7. Conclua a missão e abra **Progresso** e **Perfil** pela barra inferior.

### Monitor

1. Volte ao login ou use **Sair da conta** no perfil.
2. Selecione **Monitor** e toque em **Entrar como monitor**.
3. Na visão geral, abra a lista de participantes.
4. Selecione uma pessoa para ver progresso, dificuldades e missões recentes.
5. Percorra **Missões**, **Relatórios** e **Perfil** pela barra inferior.
6. Teste ações demonstrativas como notificações, filtros, exportação e feedback de áudio.

Antes de entregar uma alteração, execute:

```bash
npm run lint
npm run typecheck
```

Ainda não há suíte automatizada de testes unitários ou end-to-end; por isso, o percurso manual dos dois perfis faz parte da validação desta base.

## Acessibilidade

A interface foi desenhada para leitura e toque confortáveis em telas pequenas:

- títulos e textos maiores, com hierarquia curta e linguagem direta;
- botões principais com pelo menos 54 pontos de altura e botões de ícone com 48 pontos;
- suporte a rolagem, teclado e áreas seguras do iOS e Android;
- `accessibilityLabel`, papéis, estados, dicas e região de anúncio nos controles principais;
- seleção e progresso comunicados por texto/ícone, sem depender apenas de cor;
- navegação inferior com estado de aba selecionada;
- transições curtas, de aproximadamente 200 ms;
- botões de áudio com resposta visual temporária, inclusive ondas e mensagem de reprodução;
- opções demonstrativas para texto maior, alto contraste, áudio automático e resposta por voz.

As preferências de letras maiores e contraste reforçado são aplicadas pelos componentes de texto compartilhados. Áudio automático e resposta por voz permanecem identificados como demonstração: a base ainda não integra leitor de voz, reconhecimento de fala ou persistência das configurações.

## Dados mockados e limitações

Os dados de participantes, missões e indicadores estão centralizados em `src/data/mock.ts`. O `AppContext` mantém o papel autenticado localmente, preferências, conclusão da missão, tentativas, uso de ajuda e feedbacks temporários enquanto o app está aberto. Ao concluir a prática, o progresso de Maria é atualizado também nas telas do monitor.

Nesta versão:

- login e senha não são autenticados; o guard de rotas separa os dois perfis apenas dentro da sessão local;
- não existe API, banco de dados, sincronização ou armazenamento persistente;
- recarregar o aplicativo restaura os valores iniciais;
- áudio e fala são representados por feedback visual, sem reprodução ou captura real;
- o simulador não envia mensagens, fotos, localização ou transações;
- filtros, notificações, exportação e algumas opções de perfil são demonstrativos;
- métricas e gráficos usam valores estáticos ou cálculos feitos sobre os mocks;
- a interface não deve ser usada como fonte de dados reais sobre participantes.

Para evoluir esta base para produção, os próximos passos naturais são autenticação, persistência das preferências, API para turmas/missões, armazenamento seguro, áudio real, testes automatizados e revisão de acessibilidade com usuários.
