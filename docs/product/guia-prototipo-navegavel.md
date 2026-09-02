GUIA DO PROTÓTIPO NAVEGÁVEL — CELULAR SEM MEDO

Objetivo
Este documento orienta a equipe na montagem do protótipo navegável do Celular Sem Medo no Figma. A pasta abaixo deve ser usada como referência visual oficial das telas. O objetivo do protótipo é demonstrar o fluxo principal do aluno e do administrador sem exigir que todas as funções estejam implementadas de verdade.

Pasta de referência oficial
https://drive.google.com/drive/folders/1RfgoSSxa7ewC0sqczIaxoIuKf34rX82b?usp=share_link

A pasta contém 19 referências visuais: 1 tela comum de login, 12 telas do aluno e 6 telas originalmente nomeadas como monitor. Estas seis referências devem ser adaptadas para a área do administrador; monitor não é mais um papel do produto.

1. REGRA PRINCIPAL DE MONTAGEM
Use as imagens da pasta como referência visual. Não é necessário reconstruir cada detalhe exatamente como uma captura de tela; porém, cores, hierarquia, textos principais, botões, ícones e organização devem permanecer coerentes com as referências.

O protótipo deve permitir que uma pessoa entenda, apenas clicando, como o Celular Sem Medo funciona. Nenhum botão importante deve parecer interativo e ficar sem destino durante a demonstração.

2. ORGANIZAÇÃO RECOMENDADA NO FIGMA
Criar uma página chamada “Protótipo Navegável”. Dentro dela, separar os frames em quatro grupos:

A. Entrada
• Splash
• Login

B. Aluno
• Boas-vindas
• Acessibilidade
• Início
• Escolher missão
• Detalhes da missão
• Simulador seguro
• Onde eu travei
• Ajuda + nova tentativa
• Resultado da missão
• Meu progresso
• Perfil e Configurações

C. Administrador
• Visão geral
• Gestão de pessoas e turmas
• Alunos
• Detalhes do aluno
• Missões
• Relatórios
• Pedidos de ajuda
• Perfil do administrador

D. Componentes e overlays
• Estado de botão pressionado
• Overlay “Reproduzindo instrução”
• Mensagem de confirmação simples
• Estados de navegação inferior

3. TELAS DA PASTA E NOMES SUGERIDOS NO FIGMA
001 - Tela de Login → Login
01 - Splash.png → Splash
02 - Boas vindas.png → Boas-vindas
03 - Acessibilidade.png → Acessibilidade
04 - Inicio.png → Início
05 - Escolher missão.png → Escolher missão
06 - Detalhes da missão.png → Detalhes da missão
07 - Simulador seguro.png → Simulador seguro
08 - Onde eu travei.png → Onde eu travei
09 - Ajuda + nova tentativa.png → Ajuda + nova tentativa
10 - Resultado da missão.png → Resultado da missão
11 - Meu progresso.png → Meu progresso
12 - Perfil e Configurações.png → Perfil do aluno
13 - Perfil do monitor.png → Perfil do administrador
14 - Visao_geral_Monitor.png → Visão geral do administrador
15 - Participantes_Monitor.png → Alunos
16 - Detalhes_participante_Monitor.png → Detalhes do aluno
17 - Missoes_Monitor.png → Missões do administrador
18 - Relatorios_Monitor.png → Relatórios

4. FLUXO PRINCIPAL — ENTRADA
Para a demonstração, usar a Splash como ponto inicial.

Splash
→ toque na tela ou após uma pequena transição
→ Login

Na tela Login, existe uma única entrada com **Continuar com Google**. O papel nunca é escolhido livremente no cliente: o backend retorna somente os acessos previamente cadastrados.

Aluno
→ Boas-vindas
→ Acessibilidade
→ Início

Administrador
→ Visão geral da administração

No protótipo do Figma, o botão Google pode simular uma resposta já autorizada. Se a conta tiver os dois acessos, mostrar um seletor pós-login apenas entre **Aluno** e **Administrador**. Não exibir campos de senha, escolha de monitor ou seleção arbitrária de papel.

5. FLUXO PRINCIPAL — ALUNO
Fluxo demonstrativo recomendado:

Splash
→ Login
→ Boas-vindas
→ Acessibilidade
→ Início
→ Escolher missão
→ Detalhes da missão
→ Simulador seguro
→ Onde eu travei
→ Ajuda + nova tentativa
→ Resultado da missão
→ Meu progresso

Este é o fluxo mais importante do projeto porque demonstra o diferencial do Celular Sem Medo: praticar, detectar uma dificuldade, orientar, tentar novamente e mostrar evolução.

6. INTERAÇÕES DO ALUNO
Boas-vindas
• Botão “Começar” → Acessibilidade.
• Ícone de áudio → simular reprodução de áudio.

Acessibilidade
• Switches podem mudar visualmente de estado.
• Botão “Salvar e continuar” → Início.
• “Ouvir esta tela” → simular reprodução da instrução.

Início
• Card de missão recomendada → Detalhes da missão ou Escolher missão.
• Menu inferior:
  - Início → Início
  - Missões → Escolher missão
  - Progresso → Meu progresso
  - Perfil → Perfil do aluno
• Ícones de áudio → simular reprodução.

Escolher missão
• “Enviar uma foto” → Detalhes da missão.
• As demais missões podem permanecer como opções visuais sem fluxo completo no MVP, desde que não sejam usadas durante a apresentação.

Detalhes da missão
• “Começar treino” → Simulador seguro.
• Botão de áudio → simular explicação.

Simulador seguro
• O clique esperado para anexar deve avançar no fluxo.
• Para demonstrar o diferencial, também deve existir um caminho de dificuldade: após uma tentativa incorreta ou pelo botão de ajuda, navegar para “Onde eu travei”.
• “Ouvir instrução novamente” → simular áudio.
• “Dica” → pode abrir pequeno overlay ou ir para “Onde eu travei”.

Onde eu travei
• “Explicar em voz alta” → overlay de áudio ou Ajuda + nova tentativa.
• “Mostrar onde tocar” → Ajuda + nova tentativa.
• “Tentar novamente” → Simulador seguro.

Ajuda + nova tentativa
• “Ouvir novamente” → simular áudio.
• “Tentar novamente sozinho” → Simulador seguro ou, para simplificar a demo, Resultado da missão.

Resultado da missão
• “Continuar minha trilha” → Meu progresso.
• “Praticar novamente” → Detalhes da missão ou Simulador seguro.

Meu progresso
• Menu inferior deve continuar funcionando.
• Próxima missão recomendada → Detalhes da missão.

Perfil do aluno
• As configurações podem ser apenas demonstrativas.
• Acessibilidade deve mostrar os mesmos tipos de preferências definidos no início.
• “Sair da conta” → Login.

7. COMO REPRESENTAR O ÁUDIO NO PROTÓTIPO
O protótipo navegável não precisa executar reconhecimento de voz nem texto-para-fala real.

Para demonstrar a função de áudio no Figma, usar uma destas soluções:
• ao tocar no ícone de áudio, abrir um pequeno overlay com “Reproduzindo instrução…”;
• alterar temporariamente o estado do botão para “Reproduzindo…”;
• utilizar uma variante do componente com ondas de áudio ativas.

O importante é mostrar que a interação existe. A implementação real de áudio será feita posteriormente no aplicativo.

8. FLUXO PRINCIPAL — ADMINISTRADOR
Após o Google autenticar uma conta cadastrada como administrador:

Login
→ Visão geral

A navegação inferior do administrador deve ter cinco itens:
• Visão geral
• Alunos
• Missões
• Relatórios
• Perfil

Fluxo demonstrativo recomendado:

Visão geral
→ Alunos
→ selecionar Maria Aparecida/Maria Silva
→ Detalhes do aluno
→ voltar para Alunos
→ Missões
→ Relatórios
→ Perfil

9. INTERAÇÕES DO ADMINISTRADOR
Visão geral
• “Gerenciar pessoas” → gestão de usuários, com opções para remover alunos ou outros administradores, respeitando a proteção do último administrador global.
• “Gerenciar turmas” → gestão de turmas.
• “Pedidos de ajuda” → solicitações dos alunos de qualquer turma.
• Alunos → tela Alunos.
• Missões → tela Missões.
• Relatórios → tela Relatórios.
• Perfil → Perfil do administrador.
• Cards e gráficos não precisam abrir novas páginas no MVP.

Alunos
• Tocar em um aluno → Detalhes do aluno.
• Filtro pode apenas mudar visualmente ou permanecer demonstrativo.
• Botão voltar, quando houver → Visão geral.

Detalhes do aluno
• Voltar → Alunos.
• Abas internas como Resumo, Desempenho, Recursos e Histórico podem ser apenas visuais no MVP; se houver tempo, criar variantes.
• O objetivo principal é mostrar progresso, autonomia, uso de áudio, principais dificuldades e missões recentes.

Missões do administrador
• Cada missão pode ser um card.
• Para o MVP, não é obrigatório criar uma página de detalhe para cada missão.
• A tela precisa deixar evidente: progresso da turma, dificuldade e uso de áudio.

Relatórios
• Filtro de período pode ser demonstrativo.
• “Exportar” não precisa gerar PDF no protótipo; pode abrir um overlay “Relatório pronto para exportação”.
• Gráficos devem permanecer visíveis como parte da análise da turma.

Perfil do administrador
• Mostrar perfil, acesso global, preferências simples e conta.
• “Mostrar métricas de áudio” pode alternar o switch.
• “Período dos relatórios” pode abrir uma pequena lista com 7, 30 e 90 dias.
• “Sair da conta” → Login.

10. TRANSIÇÕES E COMPORTAMENTO
Manter o protótipo simples e previsível.

Recomendação:
• navegação entre telas: Instant ou Dissolve, aproximadamente 200 ms;
• overlays: aparecer sobre a tela atual;
• evitar animações longas;
• usar Smart Animate apenas quando realmente melhorar a compreensão;
• botões devem ter área de toque confortável;
• não depender apenas de cor para comunicar estados.

11. COMPONENTES QUE VALE A PENA CRIAR NO FIGMA
Criar componentes reutilizáveis para acelerar o trabalho:
• botão principal roxo;
• botão secundário;
• botão/ícone de áudio;
• switch ligado/desligado;
• card de missão;
• card de progresso;
• item de aluno;
• barra inferior do aluno;
• barra inferior do administrador;
• cabeçalho mobile;
• overlay de áudio.

12. ORDEM DE TRABALHO RECOMENDADA
1. Importar as 19 referências da pasta.
2. Criar os frames mobile no tamanho escolhido pela equipe.
3. Reproduzir primeiro o fluxo do aluno.
4. Transformar os elementos repetidos em componentes.
5. Criar a navegação inferior.
6. Conectar o fluxo do administrador.
7. Adicionar overlays de áudio.
8. Definir os pontos iniciais do protótipo.
9. Testar todos os caminhos.
10. Pedir para alguém da equipe navegar sem explicação e anotar onde houver dúvida.

13. PONTOS INICIAIS PARA APRESENTAÇÃO
Criar preferencialmente dois flows no Figma:

Flow 1 — Demo Aluno
Splash → Login → Boas-vindas → Acessibilidade → Início → Missão → Dificuldade → Ajuda → Resultado → Progresso.

Flow 2 — Demo Administrador
Login → Visão geral → Alunos → Detalhes do aluno → Missões → Relatórios → Perfil.

Isso permite apresentar rapidamente os dois lados do produto sem precisar reiniciar todo o protótipo.

14. CHECKLIST FINAL
Antes de considerar o protótipo pronto, verificar:

□ Splash leva ao Login.
□ Login possui uma única entrada com Google e simula somente papéis autorizados.
□ Não existe opção, rota ou texto de interface que trate monitor como papel ativo.
□ O fluxo completo do aluno chega até Meu progresso.
□ O caminho de dificuldade e ajuda está demonstrável.
□ Os botões de áudio têm resposta visual.
□ A navegação inferior do aluno funciona.
□ A navegação inferior do administrador funciona.
□ Alunos abre Detalhes do aluno.
□ Relatórios e Missões podem ser acessados pelo administrador.
□ Perfil do aluno e Perfil do administrador retornam ao Login ao tocar em sair.
□ Não existem botões principais sem interação durante a demo.
□ Os textos continuam legíveis em tela mobile.
□ O protótipo consegue ser entendido por alguém que não participou do desenvolvimento.

15. CRITÉRIO DE SUCESSO
O protótipo está pronto quando uma pessoa consegue entender visualmente esta história:

“Um aluno pratica uma tarefa digital em segurança, encontra uma dificuldade, recebe orientação por diferentes formas de apoio, tenta novamente e melhora. O administrador consegue acompanhar essa evolução, atender pedidos de ajuda e usar os dados para orientar as próximas atividades.”

Essa é a experiência central que o protótipo deve comunicar.
