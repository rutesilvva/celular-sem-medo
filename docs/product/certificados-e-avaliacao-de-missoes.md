# Certificados e avaliação de missões

## Certificado de participação

O aluno pode emitir o certificado quando cumprir, ao mesmo tempo:

- concluir pelo menos cinco missões diferentes;
- desenvolver competências em pelo menos três categorias;
- responder ao menos uma revisão de retenção.

O certificado guarda um retrato dos dados válidos no momento da emissão: nome do aluno, organização, responsável institucional, cargo, quantidade de missões, competências e carga horária estimada. O administrador configura a identificação institucional na tela de perfil. Não armazenamos imagem de assinatura manuscrita ou dado biométrico.

Cada certificado possui um código UUID imprevisível e um QR Code que abre a rota pública de validação do aplicativo. A validação consulta o servidor e informa se o registro existe e se não foi revogado. Isso comprova a emissão pelo sistema, mas não constitui assinatura digital ICP-Brasil.

Em staging e produção, configure `EXPO_PUBLIC_CERTIFICATE_VERIFY_URL` com a origem HTTPS onde o Expo Web foi publicado. O QR passa a apontar para `<origem>/certificate?code=...` e funciona no navegador mesmo sem o aplicativo instalado. Sem essa variável, development usa o scheme nativo como fallback controlado.

O PDF é gerado temporariamente no dispositivo e pode ser compartilhado pelo aluno. Ele contém o QR Code desenhado no próprio documento e o código de validação em texto, garantindo verificação caso a câmera não esteja disponível.

## Administração e revogação

Na área de perfil, o administrador abre a gestão de certificados para pesquisar por aluno e filtrar registros válidos ou revogados. A revogação exige uma justificativa de 5 a 200 caracteres e uma confirmação destrutiva explícita. O histórico guarda o administrador responsável, o motivo e o horário. Depois da revogação, a consulta pública do QR informa que o certificado não é válido.

O aluno pode solicitar correção do nome pelo perfil. A aprovação administrativa atualiza o retrato do nome, registra a decisão e gera um novo código, invalidando o QR anterior. A rejeição mantém o certificado original.

## Avaliação da qualidade da missão

Depois de concluir uma missão, o aluno pode informar:

- quanto a missão ajudou, de 1 a 5;
- quão clara foi a explicação, de 1 a 5;
- problemas estruturados: texto, áudio, instrução confusa, duração ou linguagem técnica;
- ausência de problema.

A opção “nenhum problema” é exclusiva e não pode ser combinada com outro motivo. Só é aceita uma avaliação por tentativa concluída e apenas pelo próprio aluno.

O painel de impacto apresenta médias e contagens agregadas. A consulta administrativa não retorna nomes, e-mails nem comentários livres. Essa escolha reduz a exposição de dados pessoais e permite priorizar melhorias editoriais com indicadores comparáveis.

A tela **Qualidade e governança** ordena as missões por clareza, utilidade e problemas registrados nos últimos 30 dias. Regras transparentes marcam conteúdo que precisa de revisão. A mesma tela concentra correções pendentes e a linha do tempo das ações administrativas.

## Apresentação e testes em aparelho

O modo de apresentação possui dados locais previsíveis, cronômetro e reinício do roteiro. O workflow `Android E2E` gera um APK de desenvolvimento, inicia um emulador e executa `.maestro/presentation-ci.yaml`. Os fluxos autenticados continuam nos roteiros de regressão e devem ser executados no preview conectado a staging, usando contas de teste — nunca credenciais pessoais.

## Segurança e acesso

- Alunos leem apenas os próprios certificados e avaliações.
- Administradores globais acessam a configuração institucional e métricas agregadas.
- O código completo é necessário para validar um certificado publicamente.
- Certificados revogados deixam de ser considerados válidos.
- A revogação é idempotente e sua justificativa fica auditável.
- As regras são aplicadas no banco por funções server-side e RLS.
