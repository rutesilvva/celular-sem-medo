# Certificados e avaliação de missões

## Certificado de participação

O aluno pode emitir o certificado quando cumprir, ao mesmo tempo:

- concluir pelo menos cinco missões diferentes;
- desenvolver competências em pelo menos três categorias;
- responder ao menos uma revisão de retenção.

O certificado guarda um retrato dos dados válidos no momento da emissão: nome do aluno, organização, responsável institucional, cargo, quantidade de missões, competências e carga horária estimada. O administrador configura a identificação institucional na tela de perfil. Não armazenamos imagem de assinatura manuscrita ou dado biométrico.

Cada certificado possui um código UUID imprevisível e um QR Code que abre a rota pública de validação do aplicativo. A validação consulta o servidor e informa se o registro existe e se não foi revogado. Isso comprova a emissão pelo sistema, mas não constitui assinatura digital ICP-Brasil.

O PDF é gerado temporariamente no dispositivo e pode ser compartilhado pelo aluno. O código de validação também aparece em texto, garantindo verificação caso a leitura do QR não esteja disponível.

## Avaliação da qualidade da missão

Depois de concluir uma missão, o aluno pode informar:

- quanto a missão ajudou, de 1 a 5;
- quão clara foi a explicação, de 1 a 5;
- problemas estruturados: texto, áudio, instrução confusa, duração ou linguagem técnica;
- ausência de problema.

A opção “nenhum problema” é exclusiva e não pode ser combinada com outro motivo. Só é aceita uma avaliação por tentativa concluída e apenas pelo próprio aluno.

O painel de impacto apresenta médias e contagens agregadas. A consulta administrativa não retorna nomes, e-mails nem comentários livres. Essa escolha reduz a exposição de dados pessoais e permite priorizar melhorias editoriais com indicadores comparáveis.

## Segurança e acesso

- Alunos leem apenas os próprios certificados e avaliações.
- Administradores globais acessam a configuração institucional e métricas agregadas.
- O código completo é necessário para validar um certificado publicamente.
- Certificados revogados deixam de ser considerados válidos.
- As regras são aplicadas no banco por funções server-side e RLS.

