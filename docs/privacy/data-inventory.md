# Inventário de dados, finalidade e retenção

Status: decisão de produto para o MVP; hipóteses legais e papéis dos parceiros
dependem da validação descrita abaixo.

Este inventário é o registro inicial das operações de tratamento. Ele cobre o
que o schema já prevê e o que será necessário na integração do backend. Uma nova
categoria, finalidade, saída do dispositivo ou fornecedor só pode entrar depois
de atualizar este documento, a política pública e, quando aplicável, as
declarações das lojas.

## Premissas jurídicas

- As bases indicadas são **candidatas**. “Execução de contrato” pressupõe uma
  relação direta com a pessoa. Quando o serviço for oferecido por escola, ONG,
  prefeitura ou patrocinador, o papel dos agentes e a hipótese de cada operação
  precisam ser definidos no contrato antes do onboarding.
- “Legítimo interesse” exige finalidade concreta, teste de balanceamento
  registrado e mecanismo de oposição quando aplicável. Não é usado para dados
  sensíveis.
- A pessoa idosa não é automaticamente titular de dado sensível, mas o contexto
  aumenta o risco e deve entrar no RIPD.
- UUID, `sub`, hash e identificador interno são pseudônimos, não dados anônimos.
- As preferências são desenhadas sem diagnóstico e classificadas inicialmente
  como dados comuns. Contexto ou associação que possa revelar saúde ou deficiência
  exige reclassificação, hipótese do art. 11 e nova avaliação antes do tratamento.

## Matriz principal

| ID | Dados e origem | Finalidade e necessidade | Hipótese legal candidata | Sistemas, pessoas e fornecedores | Retenção aprovada | Descarte |
| --- | --- | --- | --- | --- | --- | --- |
| D01 | Google `sub`, e-mail e `email_verified`; nome e avatar de `profile`. Recebidos no login e também presentes em `auth.users`, `auth.identities` e metadados do Supabase Auth | Identificar a conta, associar convite e apresentar a pessoa. O e-mail não autoriza e não é chave permanente | Art. 7º, V, na relação direta; reavaliar em implantação institucional | Google Identity; Supabase Auth; equipe autorizada. Monitor recebe apenas nome/avatar mínimos, nunca `sub` ou e-mail Google | Conta sem vínculo: até 24 h. Conta provisionada: enquanto ativa; depois segue exclusão em até 15 dias no banco ativo | Apagar identidade, metadados e perfil; pedir descarte ao operador; tombstone somente onde a integridade compartilhada exigir |
| D02 | Código, `state`, nonce, ID credential e eventual `provider_token` Google transitórios; access/refresh token Supabase, `session_id`, expiração e estado local | Concluir OAuth/OIDC, manter sessão e proteger a conta | Art. 7º, V; segurança sob art. 7º, IX após balanceamento | Google/Supabase Auth durante a troca; armazenamento seguro no aparelho somente para a sessão Supabase. Provider token não é persistido nem usado para APIs | Credencial Google: somente memória, até concluir/falhar a troca. JWT Supabase: alvo de 1 h. Sessão: inatividade máxima de 30 dias e duração absoluta de 90 dias; até logout, revogação ou exclusão | Zerar credenciais transitórias; revogar sessão no servidor; apagar SecureStore, chave, cache e fila local |
| D03 | UUID Supabase, nome exibido, avatar opcional e datas do perfil | Identificar a pessoa dentro do serviço | Art. 7º, V; base institucional a confirmar | Postgres/Supabase; titular; monitor de turma ativa vê somente a apresentação necessária | Enquanto a conta estiver ativa; banco ativo eliminado/anonimizado em até 15 dias após pedido válido | Apagar ou trocar autoria histórica por tombstone não reassociável |
| D04 | Turma, papel, estado, entrada/saída, participante/monitor, concessão de admin global e autor da turma | Autorizar server-side e organizar acompanhamento/administração | Art. 7º, V; em parceria institucional, definir controlador/instrução contratual | Supabase; titular; monitores somente da mesma turma; admins globais para operação; instituição conforme contrato | Durante o vínculo e até 24 meses após fim da turma para histórico educacional justificado; concessões administrativas seguem o prazo de auditoria | Eliminar vínculo pessoal ou anonimizar irreversivelmente; nunca manter só “porque pode ser útil” |
| D05 | E-mail convidado, turma, emissor, aceite, expiração e hash do token | Provisionar acesso sem autocadastro de papel | Art. 7º, V somente quando o convite decorrer de solicitação do titular; nos demais casos, art. 7º, IX após balanceamento ou base institucional validada | Edge Function/RPC e Supabase. Monitor usa uma visão segura sem `token_hash`; token puro aparece uma vez | Convite válido por no máximo 7 dias; e-mail e hash removidos até 30 dias depois de aceito, revogado ou expirado | Invalidar token imediatamente; apagar e-mail/hash no job de retenção |
| D06 | Idioma, fonte maior, contraste, áudio automático, velocidade, resposta por voz e onboarding | Aplicar escolhas de acessibilidade e personalização solicitadas | Art. 7º, V. Não inferir diagnóstico nem usar em analytics | Supabase; somente o titular. Preferências essenciais podem ter cache local | Enquanto a conta estiver ativa; cache até logout/troca/revogação | Apagar do banco e do dispositivo; não conservar perfil comportamental |
| D07 | Missão atribuída, turma, obrigatoriedade, janela e monitor que criou; autoria editorial | Distribuir conteúdo e provar qual versão foi praticada | Art. 7º, V para atribuição; autoria sob art. 7º, IX após balanceamento; art. 7º, VI somente em exercício de direitos ligado a processo concreto | Supabase; membros da turma conforme papel; equipe editorial | Atribuição pessoal: fim da turma + 24 meses. Conteúdo não pessoal pode ser mantido; autoria identificável deve ser removida ou justificada | Desvincular/tombstonar autoria e apagar associação pessoal ao fim do prazo |
| D08 | Tentativas, estado, passo, resultado, pontuação, início/fim e indicadores derivados de progresso | Salvar continuidade, mostrar evolução e permitir apoio pedagógico | Art. 7º, V; qualquer monitoramento adicional exige necessidade, expectativa e balanceamento | Supabase; titular; monitor somente de turma ativa. Indicadores são explicáveis e não geram exclusão automática | Até 24 meses após o encerramento da turma. Turma sem atividade de aprendizagem por 12 meses é encerrada administrativamente após validação/aviso | Apagar ou agregar com anonimização irreversível; recomputar relatórios sem a pessoa excluída |
| D09 | Eventos de tentativa: tipo, sequência, instante e payload estruturado; inclusive evento de uso de TTS/ajuda, sem conteúdo de voz | Sincronizar a tentativa e diagnosticar dificuldade com granularidade mínima | Art. 7º, V; métricas de confiabilidade sob art. 7º, IX documentado | Supabase; titular; monitor recebe somente eventos pedagógicos permitidos | Até 12 meses após fim da tentativa; agregados anônimos podem permanecer | Apagar evento/payload; conservar apenas contagem irreversivelmente anônima |
| D10 | Pedido de ajuda com código de motivo, contexto mínimo, responsável, estado, código de resolução e datas; sem texto livre no MVP | Encaminhar e resolver apoio pedagógico sem abrir canal para dados sensíveis | Art. 7º, V; base institucional a confirmar. Conteúdo sensível não é autorizado por esta base | Supabase; titular e monitor ativo da turma. Nenhum fornecedor de IA/transcrição | Até 180 dias após resolução ou cancelamento | Apagar o pedido; métricas posteriores somente anônimas. DTO/RPC rejeita qualquer campo livre antes de persistir; futura habilitação exige hipótese do art. 11 |
| D11 | Evento técnico, ambiente, versão, código de resultado, duração e ID de correlação aleatório | Operar o app e investigar falhas sem registrar conteúdo do usuário | Art. 7º, IX, com teste de balanceamento | Console sanitizado em development; fornecedor remoto ainda não aprovado | Development: até 7 dias/efêmero. Staging: 14 dias. Production operacional: 30 dias | Expiração automática do dataset; sem exportação para analytics |
| D12 | Evento de segurança, horário, decisão, IP/dispositivo apenas quando indispensáveis e referência pseudônima rotativa | Prevenir abuso, controlar acesso e investigar incidente | Art. 7º, IX; art. 7º, II/VI quando houver obrigação ou defesa de direitos | Supabase e equipe de segurança autorizada; eventual ferramenta só após DPA/scrubbing | Até 180 dias, salvo vinculação a incidente; acesso revisado trimestralmente | Expiração automática e eliminação nos operadores |
| D13 | Pedido LGPD, verificação mínima, decisões, resposta, entrega, consentimento/revogação e ledger de exclusão quando aplicável | Atender direitos, impedir ressurreição em backup, provar atendimento e resolver contestação | Art. 7º, II e VI; art. 11, II, “a” ou “d”, somente se o próprio pedido exigir dado sensível | Backend administrativo isolado; responsável por privacidade; demais agentes apenas quando necessário | Referência de sujeito no ledger: no máximo 7 dias, até vencer o backup. Evidência mínima sem associação operacional: 5 anos após encerramento como decisão provisória sujeita a validação jurídica | Apagar conteúdo excedente; ao fim de 7 dias remover associação do ledger; manter apenas protocolo, tipo, datas, decisão e cumprimento necessários |
| D14 | Registro de incidente, avaliação de risco, medidas, comunicações e evidências necessárias | Cumprir Resolução CD/ANPD nº 15/2024 e aprender com incidentes | Art. 7º, II e VI; art. 11, II, “a” ou “d”, se a evidência indispensável contiver dado sensível | Controlador, equipe de resposta, ANPD e titulares quando exigido | Mínimo de 5 anos, inclusive para incidente não comunicado | Eliminar ao fim do prazo se não houver obrigação/defesa pendente |
| D15 | Arquivo temporário de exportação JSON/CSV/HTML/PDF, manifesto, credencial estreita de privacidade e link assinado | Entregar cópia portátil/imprimível apenas ao titular, inclusive antes de purga conjunta | Art. 7º, II/VI e atendimento dos arts. 18–19 | Função server-side e storage privado; titular reautenticado | Link de uso único por até 15 min; credencial/arquivo por até 24 h; evento mínimo no D13 | Apagar automaticamente e invalidar credencial/link no primeiro uso ou expiração |
| D16 | Cache local mínimo, preferências, fila offline e conteúdo já autorizado | Funcionar no aparelho e tolerar interrupções | Mesma hipótese da operação de origem | Dispositivo do titular; sem backup de tokens ou conteúdo privado | Apenas durante a sessão/necessidade; nunca além do prazo do servidor | Limpar no logout, revogação, troca de conta e exclusão; invalidar ao mudar vínculo |
| D17 | Áudio e transcrição **futuros e bloqueados** | Permitir resposta por voz opcional | Consentimento específico (art. 7º, I); art. 11 e novo RIPD se houver dado sensível/biométrico | Preferir processamento local. Fornecedor remoto, país e suboperadores ainda não aprovados | Local: somente memória e descarte imediato. Retry remoto excepcional: criptografado por até 24 h. Transcrição: descartar após produzir intenção estruturada | Descarte verificável; nunca usar para treinamento, biometria ou revisão humana por padrão |
| D18 | Push token do Expo, plataforma e último uso; diagnóstico remoto permanece futuro e bloqueado | Avisar, mediante escolha da pessoa, sobre pedido de ajuda ou atualização | Art. 7º, V, com permissão contextual do sistema e alternativa in-app | Supabase e Expo Push; validar termos e transferência antes de production | Até logout, revogação, token inválido ou 90 dias sem uso | Remover token inválido ou revogado; payload e tela bloqueada nunca contêm PII nem contexto pedagógico |
| D19 | Apple stable subject, e-mail privado relay e nome fornecido uma vez, **condicional ao Sign in with Apple** | Cumprir requisito da versão iOS e autenticar sem definir papel | Art. 7º, V; base institucional a confirmar | Apple Identity e Supabase Auth. Nunca auto-mesclar com Google por e-mail | Mesmos prazos de D01/D02; credencial Apple revogada na exclusão | Apagar identidade/metadata; preservar somente vínculo de domínio não duplicado conforme fluxo autenticado |

## Campos livres e minimização

O schema atual contém superfícies que podem receber dados excessivos:

- `attempts.metadata`;
- `attempt_events.payload`;
- `help_requests.message` e `help_requests.resolution_note`, que permanecem sem
  uso para texto livre no MVP;
- `classes.name` e `classes.shift`;
- metadados brutos de `auth.users` e `auth.identities`.

Antes de production, JSON deve ter schema e tamanho permitidos por tipo de evento.
As chaves `token`, `authorization`, `email`, `name`, `audio`, `voice`,
`transcript`, `cookie` e equivalentes devem ser rejeitadas recursivamente. A RPC
do MVP não aceita `message`/`resolution_note` livres e mantém esses campos nulos.
Habilitá-los no futuro exige atualizar base, classificação, limite, aviso e
retenção. Áudio codificado e transcrição são proibidos nesses campos.

As claims do Google devem ser revisadas no Supabase Auth. O banco de domínio só
replica os campos usados no produto; não se copia o objeto de identidade inteiro.

## Fornecedores e transferências

| Fornecedor/parte | Uso permitido no MVP | Dados esperados | Papel e contrato | Região/transferência | Gate |
| --- | --- | --- | --- | --- | --- |
| Google Identity | Login OIDC | D01 e dados técnicos próprios do provedor | Papel real e termos Google a registrar; não presumir operador em todas as operações | Processamento internacional possível | Registrar termos, países e mecanismo antes de production |
| Apple Identity | Login alternativo na build iOS, se a exceção da Guideline 4.8 não for comprovada | D19 e dados técnicos próprios do provedor | Papel real/termos Apple a registrar; não presumir operador | Processamento internacional possível | Definir linking sem e-mail, revogação e atualização das lojas antes de ativar |
| Supabase | Auth, sessão, Postgres, Edge Functions, Storage temporário e backup | D01–D16 e D19 conforme serviço | Operador proposto; validar DPA, subprocessadores e responsabilidade compartilhada | Preferir `sa-east-1`; subprocessadores podem gerar transferência | DPA + mecanismo da Res. 19/2024 + retenções configuradas |
| Expo/EAS | Build, distribuição e push opcional de pedidos de ajuda | Código, artefato, push token e mensagem genérica sem PII | Fornecedor de desenvolvimento; confirmar contrato da organização | Pode haver processamento internacional | Aprovar termos/transferência e configurar EAS antes de production |
| Apple App Store / Google Play | Distribuição, revisão e métricas próprias das lojas | Conta da loja e telemetria administrada pela plataforma | Em geral, controladores de suas próprias operações; validar termos | Conforme a plataforma | Política e formulários consistentes com o binário |
| Instituição parceira | Provisionar turma ou prestar acompanhamento, quando contratado | D01, D03–D10 estritamente necessários | Controlador, conjunto ou operador: **pendente por contrato** | Informar por implantação | Sem dados reais antes da definição |
| Observabilidade e voz/IA | Não autorizados no MVP atual; push limitado a D18 | D11/D12/D17 se aprovados no futuro | Pendente | Pendente | RIPD/DPA/inventário/lojas antes de novos SDKs ou envio |

Escolher São Paulo para o banco reduz parte do fluxo internacional, mas não
elimina transferências de autenticação, suporte, subprocessadores ou lojas. O
registro de transferência deve informar país, finalidade, duração, agentes e
canal para direitos. Caso contratos sejam o mecanismo, devem incorporar as
cláusulas-padrão da ANPD ou outro mecanismo válido da Resolução nº 19/2024.

## Política de backup e exclusão

- Production deve ser configurado com janela máxima publicada de **7 dias** para
  backups rotacionados. Se o plano contratado não puder cumprir isso, a matriz e
  a política pública devem ser alteradas antes da primeira coleta.
- Backup é isolado, criptografado, sem consultas de produto e acessível apenas a
  responsáveis de recuperação.
- Exclusão ocorre primeiro no banco ativo. A cópia envelhece até o fim da janela,
  sem ser restaurada para uso normal.
- Toda restauração executa o ledger de exclusões e revogações antes de reabrir o
  ambiente. O ledger guarda apenas referência não utilizável pelo app, data e
  estado necessários para impedir ressurreição.
- Staging usa somente dados sintéticos e pode ser apagado a qualquer momento.
  Production nunca é copiado para development ou staging.

## Revisão de necessidade

O responsável por privacidade revisa trimestralmente jobs de expiração e
anualmente todas as linhas da matriz. A revisão registra volume, finalidade que
permanece, solicitações, incidentes, fornecedores e amostras de deleção. Falha no
job de retenção é incidente operacional e deve gerar alerta sanitizado.

## Referências oficiais

- [LGPD, especialmente arts. 6º, 7º, 11, 16, 18, 37 e 46](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [ANPD — guia de legítimo interesse](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_hipoteses_legais_tratamento_de_dados_pessoais_legitimo_interesse)
- [ANPD — relatório de impacto](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd)
- [Supabase — regiões disponíveis](https://supabase.com/docs/guides/platform/regions)
- [Supabase — sessões](https://supabase.com/docs/guides/auth/sessions)
