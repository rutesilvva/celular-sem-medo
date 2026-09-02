import type { AppEnvironment } from './env';

export function isDemoModeEnabled(input: {
  appEnvironment?: string;
  enabled?: string;
} = {}): boolean {
  const appEnvironment = input.appEnvironment ?? process.env.EXPO_PUBLIC_APP_ENV;
  const enabled = input.enabled ?? process.env.EXPO_PUBLIC_DEMO_MODE;

  return appEnvironment !== 'production' && enabled === 'true';
}

export function assertDemoModeEnvironment(appEnvironment: AppEnvironment, enabled: boolean): void {
  if (appEnvironment === 'production' && enabled) throw new Error('DEMO_MODE_FORBIDDEN_IN_PRODUCTION');
}
