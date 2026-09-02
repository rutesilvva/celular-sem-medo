export type TechnicalEvent =
  | 'app.started'
  | 'auth.failed'
  | 'auth.session_restoration_failed'
  | 'backend.request_failed'
  | 'help.subscription_failed'
  | 'speech.failed';

export type SafeDiagnostic = {
  event: TechnicalEvent;
  errorCode: string;
  timestamp: string;
  environment: string;
};

export type ObservabilityTransport = (diagnostic: SafeDiagnostic) => void | Promise<void>;
let transport: ObservabilityTransport | null = null;

export function configureObservability(next: ObservabilityTransport | null) { transport = next; }

export function sanitizeError(error: unknown): string {
  const source = error instanceof Error ? `${error.name}:${error.message}` : typeof error === 'string' ? error : 'unknown';
  if (/bearer|token|secret|password|authorization/i.test(source)) return 'REDACTED_CREDENTIAL';
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(source)) return 'REDACTED_PERSONAL_DATA';
  return source.replace(/https?:\/\/[^\s]+/gi, 'REDACTED_URL').slice(0, 120) || 'unknown';
}

export function captureTechnicalError(event: TechnicalEvent, error: unknown) {
  const diagnostic: SafeDiagnostic = {
    event,
    errorCode: sanitizeError(error),
    timestamp: new Date().toISOString(),
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'unknown',
  };
  if (process.env.EXPO_PUBLIC_OBSERVABILITY_ENABLED === 'true') void transport?.(diagnostic);
  return diagnostic;
}
