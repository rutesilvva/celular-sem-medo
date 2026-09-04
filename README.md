# Celular Sem Medo

Base mobile navegável para uma plataforma de letramento digital voltada a pessoas idosas. O produto reúne prática segura para alunos e administração global de pessoas, turmas e aprendizagem.

Esta entrega combina um aplicativo funcional em Expo/React Native com backend
Supabase versionado. Identidade, turmas, missões, progresso, pedidos de ajuda,
diagnóstico inicial, revisão espaçada e missão diária usam serviços tipados,
migrações e regras de acesso no banco. Dados sintéticos permanecem somente em
testes, seeds e no modo demonstração explicitamente habilitado.

## Visão do produto

O Celular Sem Medo ajuda uma pessoa a praticar tarefas do dia a dia — como enviar uma foto, conferir um Pix ou compartilhar a localização — em um ambiente que deixa claro que nenhuma ação real será executada. Quando surge uma dificuldade, a interface oferece explicação em áudio, indicação visual e uma nova tentativa.

Para o administrador, o aplicativo organiza pessoas e turmas e acompanha progresso, recursos de apoio e dificuldades. O objetivo desta base é tornar essa história demonstrável de ponta a ponta em um celular.

## Stack

- Expo SDK 57 e React Native 0.86;
- React 19.2 e TypeScript 6 em modo estrito;
- Expo Router para navegação baseada em arquivos;
- `@expo/vector-icons` para a iconografia;
- `react-native-safe-area-context` para respeitar as áreas seguras do aparelho;
- Supabase Auth, Postgres e RLS como backend decidido para o MVP;
- Supabase CLI 2.115.0 e Docker para o ambiente local reproduzível.

A marca oficial está empacotada localmente em `assets/`, sem depender de rede para aparecer na splash, no login e nas telas de apoio.

O projeto é mobile-first, em orientação retrato e com tema claro. A versão web existe como apoio para desenvolvimento e revisão visual.

## Fluxos implementados

### Entrada

1. A tela de abertura apresenta a marca e avança automaticamente para o login; também é possível tocar para continuar.
2. Alunos e administradores usam o mesmo botão **Continuar com Google**.
3. Depois da autenticação, os papéis são resolvidos pelo servidor; quando houver mais de um acesso, a pessoa escolhe somente entre os papéis autorizados.

### Aluno

O fluxo principal demonstra a jornada de aprender, praticar, pedir ajuda e acompanhar a própria evolução:

```text
Boas-vindas → Acessibilidade → Diagnóstico inicial → Início → Missões → Detalhes da missão
→ Simulador seguro → Dificuldade/Ajuda → Resultado → Progresso
```

A barra inferior mantém acesso a **Início**, **Missões**, **Progresso** e **Perfil**. As telas cobrem:

- introdução aos princípios de prática segura, passo a passo e apoio em áudio;
- preferências de acessibilidade e estados ligados/desligados;
- diagnóstico inicial, recomendações personalizadas, missão diária e revisões espaçadas;
- resumo do progresso e evolução de confiança e autonomia;
- grade de áreas de aprendizagem com progresso por tema;
- catálogo e detalhe de missões;
- simulação guiada de uma tarefa, sem envio de dados reais;
- caminho de dificuldade, orientação e nova tentativa;
- resultado da missão, evolução e perfil/configurações.

### Administrador

O administrador possui acesso global e pode percorrer:

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
├── login.tsx            # Entrada única com Google
├── auth/                # Callback do OAuth
├── admin/               # Administração e acompanhamento global
└── participant/         # Jornada e navegação do aluno

src/
├── components/          # Shell de tela, navegação, feedback e UI reutilizável
├── context/             # Sessão, perfil, preferências e avisos
├── features/            # Regras de autenticação e motor genérico de missões
├── hooks/               # Consultas tipadas, cache e estados de carregamento
├── lib/                 # Backend, offline, TTS, observabilidade e integrações
├── theme/               # Cores, tipografia, espaçamento, raios e sombras
└── types/               # Tipos TypeScript gerados a partir do Postgres

docs/
├── auth/                # Google OAuth, redirects e roteiro de homologação
├── adr/                 # Decisões arquiteturais
├── architecture/        # Ambientes e modelo de dados
└── privacy/             # LGPD, retenção, direitos, acesso e lojas

supabase/
├── migrations/          # Schema, constraints, índices, grants e RLS
├── config.toml          # Configuração local não secreta
└── seed.sql             # Catálogo sintético para desenvolvimento
```

As rotas ficam em `app/`, seguindo as convenções do Expo Router. Regras visuais e componentes compartilhados ficam em `src/` para evitar que cada tela replique estilos e comportamentos.

## Pré-requisitos

- Node.js 22.13 ou superior;
- npm 10 ou superior;
- Docker Desktop, OrbStack, Colima ou runtime Docker equivalente para o backend;
- para autenticação em dispositivo físico, um development build; Expo Go não é alvo do fluxo OAuth;
- opcionalmente, Android Studio para emulador Android;
- opcionalmente, macOS com Xcode para simulador iOS.

## Instalação e execução

Na raiz do projeto:

```bash
npm install
npm run start
```

O terminal abrirá o Metro Bundler e exibirá um QR Code. Esse código serve apenas
para conectar o celular ao servidor de desenvolvimento que está rodando no
computador. Ele não é um QR Code de login nem de convite para turma.

### Opção 1 — revisão rápida com Expo Go

Use esta opção para navegar e revisar telas que não dependem das integrações
nativas de produção:

1. instale o aplicativo **Expo Go** no celular;
2. mantenha celular e computador na mesma rede Wi-Fi;
3. execute `npm run start`;
4. se o terminal mostrar `Using development build`, pressione `s` para alternar
   para `Using Expo Go`;
5. no Android, abra o Expo Go e escolha **Scan QR code**; no iPhone, leia o QR
   Code usando a câmera do sistema;
6. aguarde o bundle carregar.

O Expo Go não é o ambiente de homologação do login Google deste projeto. Ele é
adequado somente para revisão visual e fluxos compatíveis.

### Opção 2 — aplicativo completo em development build

Para validar Google OAuth, callbacks, armazenamento seguro e demais recursos
nativos, instale primeiro uma development build no aparelho:

```bash
npm run build:development
```

Depois de instalar o artefato gerado pelo EAS, inicie o Metro especificamente
para o development client:

```bash
npx expo start --dev-client
```

Leia o novo QR Code no celular. Ele abrirá a development build instalada do
**Celular Sem Medo**, e não o Expo Go. Se o celular não encontrar o computador,
confirme a mesma rede Wi-Fi e a permissão de rede local. Como alternativa:

```bash
npx expo start --dev-client --tunnel
```

O tunnel depende da internet e pode ser mais lento. Para login real, as URLs,
clientes OAuth, fingerprints e callbacks do ambiente precisam estar configurados
conforme [`docs/auth/google-oauth.md`](docs/auth/google-oauth.md).

### Opção 3 — navegador

Para abrir a versão web sem QR Code:

```bash
npm run web
```

Se o Metro estiver com cache antigo, use:

```bash
npx expo start --clear
```

## Backend local

A decisão e os contratos técnicos estão documentados em:

- [ADR-0001 — backend do MVP](docs/adr/0001-backend-mvp.md);
- [Google OAuth por plataforma e ambiente](docs/auth/google-oauth.md);
- [contrato de autenticação backend e papéis](docs/auth/backend-auth-contract.md);
- [modelo de dados e matriz de acesso](docs/architecture/data-model.md);
- [ambientes development, staging e production](docs/architecture/environments.md);
- [privacidade e proteção de dados do MVP](docs/privacy/README.md);
- [política de privacidade — minuta pública](docs/privacy/privacy-policy.md);
- [inventário de dados e retenção](docs/privacy/data-inventory.md);
- [fluxos de exclusão, exportação e revogação](docs/privacy/rights-and-operations.md);
- [autorização, cenários de teste e logs](docs/privacy/authorization-and-logging.md);
- [mapeamento Google Play Data Safety e Apple App Privacy](docs/privacy/store-disclosures.md);
- [guia completo de desenvolvimento](docs/development-setup.md);
- [política de segurança das dependências](docs/dependency-security.md).

Com o Docker iniciado, prepare uma cópia local da configuração e suba a stack:

```bash
cp .env.example .env.local
npm run backend:start
npm run backend:status
```

No primeiro uso, o download das imagens pode demorar. `backend:start` aplica as
migrações e o seed automaticamente.

`backend:status` também mostra credenciais administrativas da stack local. Copie
para o app somente `API_URL` e `PUBLISHABLE_KEY`; nunca coloque `SECRET_KEY`,
`SERVICE_ROLE_KEY` ou `JWT_SECRET` em variável `EXPO_PUBLIC_*` ou no Git.

Para provar que um clone novo é reproduzível, reconstrua o banco inteiro:

```bash
npm run backend:reset
npm run backend:lint
npm run backend:test
```

O seed contém somente conteúdo sintético. Dados reais de produção nunca devem
ser copiados para development ou staging. O Google OAuth local permanece
desativado por padrão; a homologação usa credenciais externas de staging e um
development build conforme o guia de autenticação.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm run start` | Inicia o servidor de desenvolvimento do Expo. |
| `npm run android` | Abre o projeto em um dispositivo ou emulador Android. |
| `npm run ios` | Abre o projeto no simulador iOS; requer macOS e Xcode. |
| `npm run web` | Inicia a versão web para apoio à revisão visual. |
| `npm run export` | Gera os bundles de Android, iOS e web. |
| `npm run audit` | Bloqueia dependências com vulnerabilidade moderada ou superior. |
| `npm run lint` | Executa as regras do ESLint/Expo. |
| `npm run typecheck` | Valida os tipos TypeScript sem gerar arquivos. |
| `npm run backend:test` | Executa os testes pgTAP de autorização no banco local. |
| `npm run backend:test:auth` | Testa rotação e revogação de refresh na stack Auth local. |
| `npm run backend:start` | Inicia Auth, Postgres, API e Studio locais. |
| `npm run backend:status` | Mostra o status, endpoints e credenciais da stack local. |
| `npm run backend:reset` | Recria o banco local com migrações e seed. |
| `npm run backend:lint` | Analisa funções e schema Postgres locais. |
| `npm run backend:migration:new -- nome` | Cria uma nova migração SQL. |
| `npm run backend:types` | Regenera os tipos TypeScript do banco local. |
| `npm run backend:stop` | Encerra os contêineres locais sem apagar os dados. |

## Como testar a demonstração

### Participante

1. Aguarde a splash ou toque nela para abrir o login.
2. Toque em **Continuar com Google** usando uma conta cadastrada como aluno.
3. Avance pelas boas-vindas, configure a acessibilidade e responda ao diagnóstico inicial.
4. Na tela inicial, abra a missão rápida diária, uma revisão ou use a aba **Missões**.
5. Entre nos detalhes, inicie o treino e percorra o simulador.
6. Acione os recursos de áudio e o caminho de ajuda para conferir o feedback visual.
7. Conclua a missão e abra **Progresso** e **Perfil** pela barra inferior.

### Administrador

1. Volte ao login ou use **Sair da conta** no perfil.
2. Entre com uma conta Google previamente cadastrada como **Administrador**.
3. Na visão geral, abra a lista de participantes.
4. Selecione uma pessoa para ver progresso, dificuldades e missões recentes.
5. Percorra **Missões**, **Relatórios** e **Perfil** pela barra inferior.
6. Teste ações demonstrativas como notificações, filtros, exportação e feedback de áudio.

Antes de entregar uma alteração, execute:

```bash
npm run lint
npm run typecheck
npm run audit
```

Os testes automatizados, cobertura, export multiplataforma, banco e varredura de segredos rodam no quality gate descrito em `docs/quality/automated-testing.md`.

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
- preferências persistidas por conta para texto maior, alto contraste, áudio automático e resposta por voz.

As preferências são carregadas do backend após a autenticação, aplicadas pelos componentes compartilhados e mantidas em cache seguro por usuário. A base ainda não captura voz; a preferência apenas prepara a experiência para recursos futuros sujeitos aos controles de privacidade.

## Estado do produto e limitações

Identidade, vínculos, missões, tentativas, progresso, preferências e indicadores
administrativos vêm do Supabase. Dados sintéticos são restritos a testes, seeds e
ao modo demonstração explicitamente habilitado fora de produção.

Nesta versão da interface:

- o Google OAuth ainda depende dos clientes nativos e fingerprints da issue de configuração por ambiente;
- instruções usam TTS real com transcrição; captura de voz continua em homologação;
- o simulador não envia mensagens, fotos, localização ou transações;
- push, compartilhamento e acessibilidade ainda exigem validação em aparelhos físicos;
- observabilidade externa, builds assinados e materiais das lojas dependem de configuração da equipe.

Consulte [`docs/architecture/current-product-state.md`](docs/architecture/current-product-state.md)
para o inventário conciso do que está entregue e do que depende de homologação.
