import { parsePublicConfig } from './env';

describe('public environment contract', () => {
  it('accepts only public identifiers', () => {
    expect(parsePublicConfig({ appEnvironment: 'staging', supabaseUrl: 'https://project.supabase.co', supabasePublishableKey: 'sb_publishable_test' })).toEqual({ appEnvironment: 'staging', supabaseUrl: 'https://project.supabase.co', supabasePublishableKey: 'sb_publishable_test' });
  });

  it.each([
    ['EXPO_PUBLIC_APP_ENV', 'unknown', 'APP_ENV_INVALID'],
    ['EXPO_PUBLIC_SUPABASE_URL', 'not-a-url', 'SUPABASE_URL_INVALID'],
    ['EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '<placeholder>', 'SUPABASE_KEY_INVALID'],
  ])('rejects invalid %s', (key, value, error) => {
    const input: Record<string, string> = { appEnvironment: 'development', supabaseUrl: 'http://127.0.0.1:54321', supabasePublishableKey: 'sb_publishable_test' };
    const mappedKey = { EXPO_PUBLIC_APP_ENV: 'appEnvironment', EXPO_PUBLIC_SUPABASE_URL: 'supabaseUrl', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'supabasePublishableKey' }[key]!;
    input[mappedKey] = value;
    expect(() => parsePublicConfig(input)).toThrow(error);
  });
});
