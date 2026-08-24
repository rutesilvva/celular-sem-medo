# Política de Privacidade — Celular Sem Medo

Versão: 0.1 — minuta para validação

Data-base: 23 de agosto de 2026

Vigência pública: **não iniciada**

> Esta é a base do texto público. Ela não pode ser publicada como política final
> enquanto os campos marcados como pendentes não forem preenchidos e validados.

## Em poucas palavras

O Celular Sem Medo ajuda pessoas adultas, especialmente pessoas idosas, a
praticar o uso do celular em um ambiente seguro. Usamos os dados necessários para
criar a conta, organizar turmas, salvar o progresso, personalizar a experiência e
permitir que o monitor da turma ofereça apoio.

Não vendemos dados, não exibimos publicidade e não acompanhamos a pessoa em
outros aplicativos. As simulações não realizam Pix, não enviam mensagens, fotos
ou localização e não capturam dados bancários reais.

## Quem cuida dos dados

O controlador responsável pelo tratamento é:

- **Nome ou razão social:** `[PREENCHER ANTES DE PRODUCTION]`
- **CNPJ, quando pessoa jurídica:** `[PREENCHER ANTES DE PRODUCTION]`
- **Endereço:** `[PREENCHER ANTES DE PRODUCTION]`
- **Canal de privacidade:** `[PREENCHER URL E E-MAIL INSTITUCIONAL]`
- **Encarregado ou responsável:** `[PREENCHER OU INFORMAR DISPENSA APLICÁVEL]`

Quando uma escola, ONG, prefeitura ou outra instituição oferecer o serviço, o
aviso de entrada informará o papel dessa organização e como falar com ela. Esses
papéis dependem da operação e do contrato reais, não apenas do nome dado ao
documento.

## Quais dados usamos

No MVP, podemos tratar:

- identidade básica recebida no login Google: identificador da conta, e-mail
  verificado, nome e avatar;
- perfil no aplicativo, papel de participante, monitor ou administrador global, turmas e convites;
- missões atribuídas, tentativas, conclusões, pontuação, passos e uso dos recursos
  de apoio;
- preferências de idioma, tamanho de texto, contraste, áudio e onboarding;
- pedido de ajuda com motivo/contexto estruturado, estado e resposta do monitor;
- informações técnicas mínimas para autenticação, proteção da conta, prevenção e
  investigação de falhas ou incidentes.

Não usamos e-mail como chave de autorização. O papel e o acesso são determinados
por vínculos ativos no servidor.

No MVP, não acessamos a câmera ou a biblioteca nem coletamos fotos nas
simulações; podemos receber o avatar da Conta Google como parte do perfil. Não
coletamos localização, contatos, dados bancários, gravações de voz, transcrições
nem o conteúdo real das ações simuladas. Também não usamos as preferências de
acessibilidade para inferir saúde, deficiência ou diagnóstico.

O pedido de ajuda conectado usa motivos estruturados. Texto livre de participante
ou monitor não será persistido no MVP enquanto não houver controles e hipótese
adequada para eventual dado sensível inserido no campo.

O inventário completo, com armazenamento e prazos, está em
[Inventário e retenção](data-inventory.md).

## Para que usamos e qual a justificativa

As hipóteses legais abaixo são a base proposta e precisam ser confirmadas para o
modelo contratual de cada implantação:

- **execução do serviço ou procedimentos relacionados ao contrato:** autenticar,
  manter a conta, organizar a turma, salvar progresso, personalizar a experiência
  solicitada e prestar ajuda;
- **legítimo interesse, após teste documentado:** proteger contas e infraestrutura,
  evitar abuso, manter logs mínimos de segurança e melhorar a confiabilidade sem
  monitoramento incompatível com a expectativa da pessoa;
- **cumprimento de obrigação legal/regulatória e exercício de direitos:** atender
  solicitações, preservar o registro de incidentes e responder a autoridades;
- **consentimento específico:** somente para uma futura função opcional de voz ou
  transcrição quando essa for a hipótese apropriada. O consentimento poderá ser
  recusado ou retirado sem bloquear as funções que não dependam de voz.

Não usamos consentimento como autorização genérica e não usamos legítimo
interesse para dados pessoais sensíveis.

## Com quem os dados podem ser tratados

Os fornecedores previstos são:

- **Google**, para autenticar a identidade;
- **Apple Identity**, se Sign in with Apple for exigido na versão iOS;
- **Supabase**, para autenticação, sessão, banco, funções e backup;
- **Expo/EAS**, apenas para construir e distribuir o aplicativo, salvo ativação
  futura e documentada de outro serviço;
- **Apple e Google Play**, para distribuir o aplicativo e operar as respectivas
  lojas.

Eles só podem receber o necessário para sua função e devem estar cobertos pelos
contratos e configurações aplicáveis. Novos fornecedores, como observabilidade,
notificação ou transcrição, exigem atualização prévia desta política e do
inventário.

O monitor vê somente dados necessários dos participantes das turmas em que tem
vínculo ativo. A exportação pessoal do monitor não inclui automaticamente dados
dos participantes. Se uma instituição parceira usar dados para finalidade
própria, a relação e a responsabilidade serão explicadas antes do tratamento.

## Tratamento em outros países

Google, Apple Identity, Supabase ou seus subprocessadores podem realizar operações fora do
Brasil. Antes de production, o controlador registrará os países, finalidade,
duração, agentes envolvidos e o mecanismo válido de transferência internacional,
incluindo contratos e cláusulas exigidas pela ANPD. A região do banco será
informada no aviso final.

## Por quanto tempo guardamos

Guardamos cada dado somente enquanto sua finalidade exigir. Exemplos da decisão
de produto:

- conta autenticada que não possui acesso provisionado: até 24 horas;
- convite: durante a validade; dados do estado encerrado por até 30 dias;
- perfil e preferências: enquanto a conta estiver ativa;
- progresso: durante a turma e por até 24 meses após seu encerramento; uma turma
  sem atividade de aprendizagem por 12 meses será encerrada administrativamente
  após validação e aviso aplicáveis;
- pedido de ajuda estruturado: até 180 dias após a resolução;
- logs operacionais: até 30 dias; logs de segurança: até 180 dias;
- registro de incidente: no mínimo 5 anos;
- áudio futuro: preferencialmente somente em memória, com descarte imediato.

Quando uma exclusão válida for solicitada, bloqueamos o acesso e revogamos as
sessões imediatamente. O banco ativo será apagado ou anonimizado em até 15 dias,
salvo retenção legal devidamente explicada. Backups isolados expiram conforme a
janela técnica publicada e não voltam ao uso normal; uma restauração reaplica as
exclusões antes de liberar o sistema.

Dados agregados podem ser mantidos quando a anonimização for comprovadamente
irreversível. Um UUID, código ou hash que permita reassociação não é anônimo.

## Seus direitos e escolhas

A pessoa titular pode solicitar, gratuitamente:

- confirmação de tratamento e acesso;
- correção de dados incompletos, inexatos ou desatualizados;
- informação sobre compartilhamentos e critérios de tratamento;
- portabilidade, quando regulamentada e aplicável;
- anonimização, bloqueio ou exclusão de dados desnecessários, excessivos ou
  tratados em desconformidade;
- exclusão de dados tratados com consentimento, quando aplicável;
- informação sobre a possibilidade de não consentir e as consequências;
- revogação do consentimento e oposição a tratamento irregular;
- revisão e explicação de decisão automatizada, caso venha a existir;
- peticionar perante a ANPD e órgãos de defesa do consumidor.

O aplicativo terá uma Central de Privacidade e haverá um caminho público sem
login em `[PREENCHER URL /privacidade/escolhas]`. A confirmação simplificada será
imediata quando possível e a declaração completa de acesso será fornecida em até
15 dias. Adotamos até 15 dias corridos como SLA interno também para os demais
pedidos, sem afirmar que esse é um prazo legal geral.

Podemos pedir nova autenticação para proteger a conta. Documento oficial não será
solicitado por padrão. Quando não for possível atender totalmente, explicaremos o
motivo e a retenção aplicável.

## Exclusão da conta e sessões

A exclusão estará disponível em **Perfil → Privacidade → Excluir minha conta** e
em `[PREENCHER URL PÚBLICA /excluir-conta]`. O fluxo exclui a conta do Celular Sem
Medo e seus dados associados; ele não exclui a Conta Google nem o Apple ID.

Ao confirmar a exclusão, o sistema bloqueia novas operações, revoga as sessões em
todos os dispositivos e inicia a eliminação. O aplicativo também oferecerá “Sair
de todos os dispositivos”. Detalhes e prazos estão em
[Direitos e operação](rights-and-operations.md).

## Segurança e incidentes

Usamos separação de ambientes, criptografia em trânsito, sessão protegida no
dispositivo, menor privilégio, políticas de acesso no banco e logs sanitizados.
Nenhum método elimina todo o risco. Incidentes são avaliados e registrados; os
casos relevantes são comunicados à ANPD e às pessoas afetadas no prazo
regulatório aplicável.

## Microfone e voz

O MVP não grava voz. Uma versão futura pedirá explicação e escolha no momento do
uso, antes da permissão do sistema. Sempre haverá alternativa sem voz. A permissão
do Android ou iOS não substitui o consentimento ou aviso necessário.

Não permitiremos biometria de voz, treinamento geral de modelos ou revisão humana
do áudio por padrão. Qualquer envio externo exigirá fornecedor identificado,
finalidade, país, retenção, contrato e nova avaliação de impacto.

## Crianças e adolescentes

O MVP é destinado a pessoas com 18 anos ou mais e não é projetado para crianças
ou adolescentes. O acesso é provisionado, sem coletar documento ou data de
nascimento só para comprovar essa regra. Antes da publicação em loja, avaliaremos
também o critério de “acesso provável” do ECA Digital. Se menores entrarem no
escopo, será necessário um desenho específico orientado ao melhor interesse e uma
nova política.

## Alterações e contato

Mudanças relevantes serão comunicadas de forma clara antes de entrarem em vigor
quando isso for necessário. A versão e a data desta política permanecerão
visíveis. Dúvidas e pedidos devem ser enviados ao canal de privacidade indicado
na seção “Quem cuida dos dados”.

## Referências oficiais

- [LGPD — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [ANPD — direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares)
- [ANPD — guia de legítimo interesse](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_hipoteses_legais_tratamento_de_dados_pessoais_legitimo_interesse)
- [ANPD — ECA Digital](https://www.gov.br/anpd/pt-br/assuntos/eca-digital)
