# Privacidade e proteção de dados do MVP

Status: **contrato de produto aprovado para implementação; publicação bloqueada até o checklist de produção ser concluído**.

Este diretório define como o Celular Sem Medo trata dados pessoais no MVP. As
decisões se aplicam ao aplicativo mobile, Supabase, autenticação Google, rotinas
administrativas e fornecedores contratados. Elas também orientam as próximas
migrações e os formulários das lojas.

O aplicativo já possui persistência, RLS, exportação, exclusão, revogação e testes
automatizados. Dados sintéticos ficam restritos a testes, seeds e demonstração
explicitamente habilitada. Estes documentos continuam condicionando o uso de
dados reais às decisões institucionais e homologações externas listadas abaixo.

## Documentos

- [Política de privacidade](privacy-policy.md): texto público-base, em linguagem
  simples, com campos institucionais ainda pendentes.
- [Inventário e retenção](data-inventory.md): finalidade, hipótese legal
  candidata, fornecedores, armazenamento e descarte de cada conjunto de dados.
- [Direitos e operação](rights-and-operations.md): exclusão, exportação,
  revogação de sessões, incidentes e eventual uso de microfone.
- [Autorização, logs e testes](authorization-and-logging.md): matriz server-side,
  cenários positivos e negativos e contrato de telemetria sanitizada.
- [Declarações das lojas](store-disclosures.md): respostas-base para Google Play
  Data Safety e Apple App Privacy.

## Decisões obrigatórias do MVP

1. O MVP é destinado a pessoas com 18 anos ou mais e o acesso é provisionado por
   convite ou vínculo administrativo. Não se coleta data de nascimento ou
   documento apenas para comprovar idade.
2. Alunos e administradores autenticam com Google, mas o Google não define o
   papel. No iOS, Sign in with Apple deverá ser oferecido se a exceção estrita da
   loja não for comprovada. Em qualquer provedor, o backend consulta vínculos
   ativos em cada operação e nunca mescla contas apenas pelo e-mail.
3. O login pede apenas `openid`, `email` e `profile`. Credenciais Google são
   processadas transitoriamente para autenticar, mas provider tokens não são
   persistidos nem usados para acessar APIs. Gmail, Drive, Calendar, contatos,
   telefone, idade e acesso offline estão fora do MVP.
4. Não há publicidade, venda de dados, data broker ou rastreamento entre apps.
5. Fotos, localização, dados bancários e voz reais não são coletados nas
   simulações. O roteiro de áudio do produto não é uma gravação do participante.
6. Tokens, códigos OAuth, nome, e-mail, avatar, texto de ajuda, voz, transcrição e
   corpos de requisição nunca entram em logs, analytics ou relatórios de erro.
7. UUIDs e hashes continuam sendo dados pessoais pseudonimizados. Só uma
   anonimização irreversível permite retenção sem vínculo com a pessoa.
8. Preferências de acessibilidade não podem ser usadas para inferir diagnóstico,
   deficiência ou condição de saúde.
9. Voz ou transcrição remota permanece bloqueada até haver avaliação de impacto,
   fornecedor aprovado, contrato, consentimento específico e atualização das
   declarações das lojas.
10. O produto adota um SLA interno de até 15 dias corridos para pedidos de
    titulares. Esse SLA não deve ser apresentado como prazo legal geral: a LGPD
    fixa 15 dias especificamente para a declaração completa de confirmação e
    acesso, e os demais direitos devem ser atendidos imediatamente quando
    possível.

## Bloqueios para tratar dados reais

Antes de habilitar autenticação real em production, é obrigatório:

- [ ] preencher razão social/nome, CNPJ quando houver, endereço, contato do
  controlador e canal do encarregado ou responsável por privacidade;
- [ ] decidir, por contrato, se escola, ONG, prefeitura ou patrocinador atua como
  controlador, controlador conjunto ou operador;
- [ ] validar com assessoria jurídica as hipóteses legais da matriz, o prazo de
  registros de direitos e o enquadramento no ECA Digital;
- [ ] concluir um Relatório de Impacto à Proteção de Dados, considerando o público
  idoso e o monitoramento longitudinal de aprendizagem;
- [ ] contratar e registrar termos/DPA aplicáveis, subprocessadores, países e
  mecanismo de transferência internacional de Google, Apple Identity, Supabase e
  demais agentes;
- [ ] escolher a região de production; preferir São Paulo quando disponível, sem
  tratar localização regional como prova isolada de conformidade;
- [ ] implementar as mudanças técnicas listadas em
  [Direitos e operação](rights-and-operations.md#lacunas-técnicas-que-bloqueiam-production)
  e aprovar os testes de autorização;
- [ ] publicar URLs permanentes de política, escolhas de privacidade e exclusão de
  conta, acessíveis sem login;
- [ ] adicionar Sign in with Apple no iOS, salvo se for comprovado que o app
  rejeita contas pessoais e exige exclusivamente contas educacionais/empresariais
  gerenciadas preexistentes, hipótese que ainda precisa ser validada com App
  Review sob a Guideline 4.8;
- [ ] revisar os SDKs do binário final e preencher Data Safety/App Privacy de
  acordo com a coleta real daquela versão.

## Responsabilidade e revisão

| Papel | Responsabilidade | Situação |
| --- | --- | --- |
| Controlador | Define finalidade, meios essenciais e responde aos titulares | **Identidade pendente** |
| Responsável por privacidade/encarregado | Recebe pedidos e mantém este registro | **Nome e canal pendentes** |
| Engenharia | Implementa minimização, RLS, retenção, exportação, exclusão e logs | Definido por estes documentos |
| Produto | Justifica cada dado e atualiza o inventário antes de novas coletas | Definido por estes documentos |
| Instituição parceira | Papel depende do contrato e da operação real | **Pendente por parceria** |
| Operadores | Processam conforme contrato e instruções do controlador | **Validar antes de production** |

Revisar este pacote a cada nova categoria de dado, fornecedor, finalidade,
integração, país de processamento ou mudança relevante de retenção, e ao menos
uma vez por ano. A data-base desta versão é **23 de agosto de 2026**.

## Rastreabilidade da Issue #2

| Critério de aceite | Evidência |
| --- | --- |
| Política de privacidade e matriz de dados | `privacy-policy.md` e matriz D01–D19 em `data-inventory.md` |
| Exclusão e exportação com comportamento/prazo | `rights-and-operations.md`, incluindo SLA, ordem transacional e backup |
| Regras de acesso e cenários para ambos os papéis | Matriz e casos AUTH/PART/MON/CTX/PRIV em `authorization-and-logging.md` |
| Logs sem segredo ou dado pessoal sensível | Allowlist, exemplos sanitizados, campos proibidos e testes-canário em `authorization-and-logging.md` |
| Google Play Data Safety e Apple App Privacy | Matrizes e checklist por release em `store-disclosures.md` |
| Google mínimo e voz futura | Scopes fixados neste índice/lojas e gates de consentimento/descarte em `rights-and-operations.md` |

As lacunas técnicas encontradas não estão escondidas: possuem IDs `PRIV-*`,
correção e evidência esperada. A Issue #2 conclui a **definição**; essas lacunas
devem ser implementadas e automatizadas antes de tratar dados reais.

## Referências oficiais principais

- [Lei Geral de Proteção de Dados Pessoais — texto compilado](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [ANPD — direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares)
- [ANPD — perguntas frequentes](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes)
- [Resolução CD/ANPD nº 2/2022 — tratamento de alto risco](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022)
- [Resolução CD/ANPD nº 18/2024 — encarregado e canal de titulares](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/processo_integra_-resolucao_cd_anpd_no_18_2024.pdf)
- [Resolução CD/ANPD nº 15/2024 — incidentes](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/documentos/rcis___anonimizado_final_ocultado_2_parte3.pdf)
- [Resolução CD/ANPD nº 19/2024 — transferências internacionais](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024)
- [ANPD — ECA Digital](https://www.gov.br/anpd/pt-br/assuntos/eca-digital)
