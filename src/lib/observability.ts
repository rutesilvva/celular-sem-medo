export type TechnicalEvent =
  | 'app.started'
  | 'auth.failed'
  | 'auth.session_restoration_failed'
  | 'backend.request_failed'
  | 'help.subscription_failed'
  | 'speech.failed'
  | 'usage.event';

export type UsageEventName = 'report_exported' | 'admin_help_opened' | 'voice_consent_seen' | 'mission_completed';

export type SafeDiagnostic = {
  event: TechnicalEvent;
  errorCode: string;
  timestamp: string;
  environment: string;
};

export type SafeUsageEvent = {
  event: UsageEventName;
  timestamp: string;
  environment: string;
  missionId?: string;
  completed?: boolean;
};

export type ObservabilityTransport = (diagnostic: SafeDiagnostic | SafeUsageEvent) => void | Promise<void>;
let transport: ObservabilityTransport | null = null;

export function configureObservability(next: ObservabilityTransport | null) { transport = next; }

export function sanitizeError(error: unknown): string {
  const source = error instanceof Error ? `${error.name}:${error.message}` : typeof error === 'string' ? error : 'unknown';
  if (/bearer|token|secret|password|authorization/i.test(source)) return 'REDACTED_CREDENTIAL';
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(source)) return 'REDACTED_PERSONAL_DATA';
  return source.replace(/https?:\/\/[^\s]+/gi, 'REDACTED_URL').slice(0, 120) || 'unknown';
}

export function sanitizeEventPayload<T extends Record<string, unknown>>(payload: T): T {
  const clone = { ...payload } as Record<string, unknown>;
  for (const key of Object.keys(clone)) {
    const value = clone[key];
    if (/name|email|phone|cpf|voice|transcript|content|message|token|secret|password|authorization/i.test(key)) {
      clone[key] = /token|secret|password|authorization/i.test(key) ? 'REDACTED_CREDENTIAL' : 'REDACTED_PERSONAL_DATA';
      continue;
    }
    if (typeof value === 'string' && /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(value)) {
      clone[key] = 'REDACTED_PERSONAL_DATA';
    }
    if (typeof value === 'string' && /bearer|token|secret|password|authorization/i.test(value)) {
      clone[key] = 'REDACTED_CREDENTIAL';
    }
  }
  return clone as T;
}

export function createUsageEventSummary<T extends Record<string, unknown>>(payload: T) {
  const sanitized = sanitizeEventPayload(payload);
  return `${sanitized.event ?? 'usage.event'}:${JSON.stringify(sanitized)}`;
}

export function captureUsageEvent<T extends Record<string, unknown>>(event: UsageEventName, payload: T) {
  const safe: SafeUsageEvent = {
    event,
    timestamp: new Date().toISOString(),
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'unknown',
    missionId: typeof payload.missionId === 'string' ? payload.missionId : undefined,
    completed: typeof payload.completed === 'boolean' ? payload.completed : undefined,
  };
  const sanitized = sanitizeEventPayload(safe as Record<string, unknown>) as SafeUsageEvent;
  if (process.env.EXPO_PUBLIC_OBSERVABILITY_ENABLED === 'true') void transport?.(sanitized);
  return sanitized;
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
