# Google Play Data Safety e Apple App Privacy

Status: respostas-base do MVP, **não prontas para submissão**.

Os formulários descrevem o binário realmente distribuído, incluindo SDKs e
processamento por parceiros. Eles devem ser refeitos a cada release. Funcionalidade
planejada não é declarada antes de existir; qualquer SDK ou coleta nova precisa
ser inventariada antes de entrar no artefato.

## Premissas da versão mapeada

- login Google e Supabase conectados;
- público adulto, acesso provisionado e dois papéis server-side;
- sem anúncios, venda, data broker ou tracking entre apps/sites;
- sem analytics/observabilidade remotos além dos logs mínimos aprovados;
- sem push, captura de câmera/biblioteca, localização real, dado financeiro real,
  contatos do aparelho, microfone ou transcrição; o avatar Google é a única foto
  recebida;
- simulações permanecem locais e não executam ação real;
- Supabase contratado como operador/service provider e instituições parceiras com
  papel definido antes da coleta;
- transporte cifrado em todos os fluxos;
- para copiar as respostas-alvo, exclusão no app e URL pública implementadas e
  testadas. **No estado atual, esses fluxos ainda não existem e a build não está
  pronta para submissão.**

Se qualquer premissa for falsa, não se deve copiar as respostas abaixo.

## Google Play Data Safety

“Coletado” significa que o dado sai do dispositivo, mesmo quando vai para um
operador. “Compartilhado” depende da relação e das exceções da política; contratar
um service provider pode evitar a marca de compartilhamento, mas nunca elimina a
declaração de coleta.

| Categoria/Data type | Coletado | Compartilhado proposto | Obrigatório | Finalidade | Observação |
| --- | --- | --- | --- | --- | --- |
| Personal info — Name | Sim | Resposta-alvo “Não”, condicionada abaixo | Sim para o login | App functionality; Account management | Claim `profile`; uso restrito à apresentação |
| Personal info — Email address | Sim | Resposta-alvo “Não”, condicionada abaixo | Sim para identidade/convite | App functionality; Account management; Fraud prevention, security and compliance | Não exibir ao monitor nem usar como autorização |
| Personal info — User IDs | Sim | Resposta-alvo “Não”, condicionada abaixo | Sim | App functionality; Account management; Fraud prevention, security and compliance | Google `sub`/UUID são vinculados à pessoa |
| Photos and videos — Photos | Sim | Resposta-alvo “Não”, condicionada abaixo | Sim para quem usa login Google; a claim pode não ter valor se a conta não possui foto | App functionality; Personalization | Avatar recebido em `profile`/metadados do Auth; não é foto da simulação |
| Personal info — Other info | Sim | Resposta-alvo “Não”, condicionada abaixo | Obrigatório pelo papel/vínculo; preferências individuais são opcionais | App functionality; Account management; Personalization | Papel, turma, vínculo, idioma e acessibilidade; não inferir saúde |
| App activity — App interactions | Sim | Resposta-alvo “Não”, condicionada abaixo | Sim para a experiência conectada | App functionality; Personalization | Etapas e uso de apoio/TTS, sem áudio da pessoa |
| App activity — Other actions | Sim | Resposta-alvo “Não”, condicionada abaixo | Sim para salvar progresso; ajuda é opcional | App functionality; Personalization | Tentativas, pontuação, conclusão e código estruturado de ajuda |
| Messages — Other in-app messages | Não nesta baseline | — | — | — | Habilitar/declarar antes de permitir texto livre entre participante e monitor |
| App info and performance — Crash logs/Diagnostics | Não nesta baseline | — | — | — | Marcar “Sim” antes de incluir Sentry ou diagnóstico remoto |
| Device or other IDs | Pendente de auditoria do SDK/tráfego e orientação do fornecedor | Pendente | Pendente | Definir conforme uso real | IP não implica automaticamente esta categoria; não submeter o formulário enquanto a classificação estiver pendente |
| Audio files — Voice or sound recordings | Não | — | — | — | Uso de TTS é interação, não gravação; voz futura exige nova declaração |
| Photos and videos — Videos | Não | — | — | — | Nenhuma captura; a única foto é o avatar já declarado |
| Location — Approximate location / Precise location | Não | — | — | — | Simulação de compartilhar localização não lê GPS |
| Financial info — User payment info / Purchase history / Credit score / Other financial info | Não | — | — | — | Simulação de Pix não lê nem transmite dado financeiro real |
| Contacts — Contacts | Não | — | — | — | Nenhum scope/permissão de contatos |
| Health and fitness — Health info / Fitness info | Não | — | — | — | Preferência acessível não é usada para inferir saúde |
| Files and docs — Files and docs | Não | — | — | — | Nenhum acesso a arquivo real |
| Calendar — Calendar events | Não | — | — | — | Nenhum scope/permissão de agenda |

Respostas de segurança e decisões internas, somente depois dos testes:

| Item | Resposta-alvo | Condição de publicação |
| --- | --- | --- |
| Dados são criptografados em trânsito? | Sim | HTTPS/TLS em app e todos os SDKs, sem exceção |
| Usuário pode solicitar exclusão? | Sim | Fluxo in-app e página web direta funcionando em todas as regiões |
| Decisão interna: venda/publicidade/tracking | Não | Confirmar contratos, SDKs e instituições; refletir finalidade/compartilhamento em cada data type |
| Público/Families | Baseline adulta | Reavaliar imediatamente se crianças/público misto entrarem no escopo |

A resposta-alvo “não compartilhado” só vale se, cumulativamente: Supabase atuar
sob instruções/contrato como service provider; o envio ao Google se enquadrar na
exceção aplicável à ação iniciada/consentida pela pessoa; e nenhuma instituição
decidir finalidade própria ou receber cópia independente. Falha em qualquer
condição exige marcar compartilhamento nos data types afetados.

### URL de exclusão exigida

Preencher no Play Console uma página pública como
`[PREENCHER https://dominio/excluir-conta]` que:

- identifica Celular Sem Medo e o desenvolvedor;
- inicia a solicitação sem reinstalar o app;
- informa os dados apagados, exceções e prazo;
- não redireciona para uma home/política genérica;
- oferece alternativa acessível e confirma conclusão.

O mesmo caminho deve existir dentro do aplicativo.

## Apple App Privacy

Na Apple, dados coletados pelo app ou parceiros entram na declaração mesmo quando
o Google Play poderia tratá-los como não “compartilhados”. Para a baseline, todos
os itens abaixo são vinculados à identidade e **não usados para tracking**.

| Apple data type | Coletado | Finalidade selecionada | Vinculado | Tracking | Origem no produto |
| --- | --- | --- | --- | --- | --- |
| Contact Info — Name | Sim | App Functionality | Sim | Não | Login/perfil |
| Contact Info — Email Address | Sim | App Functionality | Sim | Não | Login/convite |
| Identifiers — User ID | Sim | App Functionality | Sim | Não | Google `sub`, UUID/sessão materialmente associados |
| User Content — Photos or Videos | Sim | App Functionality; Product Personalization | Sim | Não | Avatar Google recebido pelo Auth; não é foto da simulação |
| Usage Data — Product Interaction | Sim | App Functionality; Product Personalization | Sim | Não | Etapas e uso do apoio/TTS |
| Usage Data — Other Usage Data | Sim | App Functionality; Product Personalization | Sim | Não | Tentativas, progresso, pontuação, conclusão e ajuda estruturada |
| Other Data — Other Data Types | Sim | App Functionality; Product Personalization | Sim | Não | Papel, turma, vínculo e preferências |
| User Content — Emails or Text Messages / Other User Content | Não nesta baseline | — | — | — | Reavaliar antes de permitir texto livre; ajuda pedagógica não é Customer Support do desenvolvedor |
| Diagnostics — Crash/Performance/Other Diagnostic Data | Não nesta baseline | — | — | — | Atualizar antes de incluir coleta remota |
| User Content — Audio Data | Não | — | — | — | Voz futura exige nova declaração |
| Location — Precise Location / Coarse Location | Não | — | — | — | Simulação não acessa GPS |
| Financial Info — Payment Info / Credit Info / Other Financial Info | Não | — | — | — | Simulação de Pix não usa dado real |
| Contacts — Contacts | Não | — | — | — | Sem permissão de contatos |
| Health & Fitness — Health / Fitness | Não | — | — | — | Sem inferência a partir de acessibilidade |
| Purchases — Purchase History | Não | — | — | — | Sem compra dentro do app nesta baseline |
| Sensitive Info | Não | — | — | — | Texto livre e inferência sensível ficam bloqueados |

Não selecionar “Analytics” apenas porque há progresso pedagógico. Essa finalidade
só entra se a equipe realmente usar os dados para medir comportamento/qualidade
do produto. Relatórios necessários à turma ficam em App Functionality e, quando
houver adaptação solicitada, Product Personalization.

### Login no iOS

A App Review Guideline 4.8 exige uma opção de login equivalente quando um serviço
de terceiros autentica a conta principal. Como o modelo atual aceita contas
pessoais por convite, a decisão segura é implementar **Sign in with Apple** no iOS
ao lado do Google, com a mesma capacidade essencial e suporte a e-mail privado.

A exceção só pode ser considerada se o app exigir exclusivamente contas
educacionais/empresariais gerenciadas preexistentes e rejeitar contas pessoais no
servidor. Nesse caso, validar a claim assinada `hd`; domínio textual do e-mail e o
parâmetro visual `hd` não provam a restrição. Ser um aplicativo educacional ou
usar convite comum não basta. Até haver essa evidência e aceite da App Review,
Sign in with Apple é requisito de release iOS.

Google continua disponível para participante e monitor, e nenhum provedor define
o papel. Se Apple for adicionado:

- provisionar pelo convite/token ou operação administrativa, nunca casar ou
  mesclar contas apenas pelo e-mail;
- tratar e-mail privado relay como diferente do e-mail Google e associar
  identidades somente em fluxo autenticado explícito;
- usar o identificador estável do provedor e impedir duplicidade de pessoa sem
  auto-merge inseguro;
- revogar a credencial Apple na exclusão;
- atualizar política, inventário, testes e ambas as declarações das lojas.

### Exclusão e URLs

- A ação deve ficar fácil de encontrar em **Perfil → Privacidade e dados → Excluir
  minha conta**.
- Se abrir a web, deve ir diretamente ao fluxo de exclusão, não à página inicial.
- Reautenticação e confirmação são permitidas; telefonema ou e-mail obrigatório
  para iniciar não são apropriados ao fluxo normal.
- Processo assíncrono é possível se o prazo for informado e a conclusão for
  confirmada.
- A App Store Privacy Policy URL aponta para
  `[PREENCHER https://dominio/privacidade]`.
- A mesma política fica facilmente acessível dentro do aplicativo, sem exigir que
  a pessoa encontre primeiro a página da loja.
- A Privacy Choices URL opcional deve apontar para
  `[PREENCHER https://dominio/privacidade/escolhas]`.

## Voz/transcrição: como atualizar no futuro

| Implementação | Google Play | Apple | Gate adicional |
| --- | --- | --- | --- |
| Processamento apenas no dispositivo | Não é coleta off-device | Não é coleta | Permissão contextual, indicador visual/audível e alternativa sem voz |
| Envio efêmero para resposta em tempo real, sem acesso/retenção além do necessário | Declarar Voice or sound recordings e processamento efêmero conforme a definição vigente | Pode não ser “collected” se app/parceiro não retém nem acessa além da resposta em tempo real; validar no momento | Disclosure e permissão explícita para o terceiro/IA; contrato de zero retenção, sem treinamento/log/revisão humana |
| Áudio retido | Audio files — Voice or sound recordings | User Content — Audio Data | Consentimento, prazo, fornecedor, país e RIPD |
| Transcrição persistida | Other user-generated content/Other in-app messages | Other User Content ou Emails or Text Messages, conforme a função | Finalidade separada e retenção explícita |

As regras e taxonomias podem mudar. A equipe deve consultar a versão oficial
vigente na data da submissão.

## Checklist por release

- [ ] gerar inventário real dos SDKs, manifests, permissões e endpoints do binário;
- [ ] conferir que não há `NSMicrophoneUsageDescription`, permissões Android ou
  plugin de coleta não usados;
- [ ] revisar Privacy Manifest/Required Reason APIs e manifests de terceiros no
  iOS;
- [ ] revisar Android manifest mesclado e dependências transitivas;
- [ ] executar teste de rede em Android/iOS para comparar tráfego com a matriz;
- [ ] testar exclusão in-app e URL pública sem conta instalada;
- [ ] confirmar DPA, papel das instituições e conclusão “não compartilhado”;
- [ ] confirmar criptografia em trânsito em todos os fluxos;
- [ ] revisar Google scopes e consent screen por ambiente;
- [ ] publicar a política em domínio verificado e concluir brand verification do
  consent screen quando exigido;
- [ ] decidir Sign in with Apple/exceção da Guideline 4.8;
- [ ] registrar responsável, data, versão/build e evidências do preenchimento;
- [ ] atualizar política e pedir novo consentimento somente se uma mudança exigir.

## Referências oficiais

- [Google Play — Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play — exclusão de conta](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Google Play — User Data](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Apple — App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple — gerenciar App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [Apple — Account Deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app)
- [Apple — App Review Guidelines 4.8 e 5.1](https://developer.apple.com/app-store/review/guidelines/)
- [Apple — Privacy Manifests](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests)

## Google OAuth mínimo

O consentimento pede somente:

```text
openid email profile
```

- `sub` é o identificador estável recebido pelo provedor; e-mail pode mudar.
- `profile` é usado porque a baseline apresenta nome/avatar e, por isso, Photos é
  declarado. Se o produto eliminar o avatar, deverá redesenhar o nome (por
  exemplo, escolha no app), retirar `profile` e garantir que o Auth não receba a
  picture; apenas deixar de copiar para `public.profiles` não elimina a coleta.
- Não pedir `access_type=offline`, provider refresh token, Gmail, Drive, Calendar,
  contatos, telefone ou idade.
- Usar clientes OAuth separados para web, Android e iOS e projetos separados por
  environment.
- Não duplicar provider tokens ou a resposta bruta nas tabelas de domínio. O
  Supabase Auth mantém metadados em `auth.users.raw_user_meta_data` e
  `auth.identities.identity_data`; auditar/minimizar esses campos e declará-los.
- Publicar a política no domínio verificado usado pela tela de consentimento e
  concluir a verificação de marca quando aplicável.
- Cadastrar client IDs separados por plataforma/ambiente. Ao configurar a lista
  de client IDs autorizados no Supabase, manter o web client ID como entrada
  principal e conferir a ordem/formato exigidos pela documentação vigente.
- No fluxo `signInWithIdToken`, usar nonce e manter a validação habilitada; não
  usar `skip_nonce_check=true`.

Referências: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect),
[OAuth scopes](https://developers.google.com/identity/protocols/oauth2/scopes) e
[Supabase Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google).
