import { getPresentationReadiness } from './presentation-readiness';

describe('presentation readiness', () => {
  it('reports a safe staging presentation build as ready', () => {
    const checks = getPresentationReadiness({ appEnvironment: 'staging', demoMode: 'true', supabaseUrl: 'https://project.supabase.co', supabaseKey: 'public-key', googleWebClientId: 'client.apps.googleusercontent.com' });
    expect(checks.every((check) => check.status === 'ready')).toBe(true);
  });
  it('warns without external configuration but keeps local content ready', () => {
    const checks = getPresentationReadiness({ appEnvironment: 'development', demoMode: 'true' });
    expect(checks.find((check) => check.id === 'local-content')?.status).toBe('ready');
    expect(checks.find((check) => check.id === 'google')?.status).toBe('warning');
    expect(checks.find((check) => check.id === 'supabase')?.status).toBe('warning');
  });
  it('never considers production demo configuration ready', () => {
    expect(getPresentationReadiness({ appEnvironment: 'production', demoMode: 'true' }).find((check) => check.id === 'environment')?.status).toBe('warning');
  });
});
