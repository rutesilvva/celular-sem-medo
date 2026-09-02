import { assertDemoModeEnvironment, isDemoModeEnabled } from './demo-mode';

describe('demo mode', () => {
  it('requires an explicit opt-in', () => {
    expect(isDemoModeEnabled({ appEnvironment: 'development' })).toBe(false);
    expect(isDemoModeEnabled({ appEnvironment: 'development', enabled: 'false' })).toBe(false);
    expect(isDemoModeEnabled({ appEnvironment: 'development', enabled: 'true' })).toBe(true);
  });

  it('never enables demo mode in production', () => {
    expect(isDemoModeEnabled({ appEnvironment: 'production', enabled: 'true' })).toBe(false);
    expect(() => assertDemoModeEnvironment('production', true)).toThrow('DEMO_MODE_FORBIDDEN_IN_PRODUCTION');
  });

  it('allows an explicitly configured non-production build', () => {
    expect(isDemoModeEnabled({ appEnvironment: 'staging', enabled: 'true' })).toBe(true);
    expect(() => assertDemoModeEnvironment('staging', true)).not.toThrow();
  });
});
