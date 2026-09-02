# Observabilidade sem dados pessoais

O módulo `src/lib/observability.ts` aceita somente eventos técnicos enumerados e um código de erro sanitizado. Não são aceitos campos livres de contexto, nome, e-mail, voz, texto de missão, token, cabeçalho ou URL completa.

Por padrão, nenhum evento sai do aparelho. Para conectar um fornecedor futuramente, configure um transporte que receba apenas `SafeDiagnostic` e ative `EXPO_PUBLIC_OBSERVABILITY_ENABLED=true` no ambiente EAS. Chaves privadas do fornecedor devem permanecer no backend; DSNs públicos precisam ser avaliados antes de entrar no bundle.

Falhas contendo padrões de credencial ou e-mail viram códigos de redação. A coleta deve manter retenção mínima, acesso restrito, alertas agregados e nunca gravar payloads de APIs.

O `AppErrorBoundary` captura exceções não tratadas, apresenta recuperação acessível e envia somente evento e código sanitizado quando o transporte estiver habilitado. O transporte deverá separar os ambientes pelo campo `environment` e publicar source maps vinculados ao commit/build.

Alertas mínimos: aumento de `auth.failed`, `auth.session_restoration_failed`, `backend.request_failed` e `app.unhandled_error`. O responsável de plantão deve confirmar o ambiente, comparar a versão afetada, desabilitar feature flags quando possível e registrar decisão de rollback. Nenhum alerta pode incluir payload, nome, e-mail, voz, consulta de IA ou token.
