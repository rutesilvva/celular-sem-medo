import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { exchangeGoogleCode, GoogleAuthError, signInWithGoogle } from './google-auth';
import { getSupabase } from './supabase';

jest.mock('./supabase', () => ({ getSupabase: jest.fn() }));
jest.mock('expo-linking', () => ({ createURL: jest.fn(() => 'celularsemmedo://auth/callback') }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn(), openAuthSessionAsync: jest.fn(), dismissAuthSession: jest.fn() }));

const mockedGetSupabase = jest.mocked(getSupabase);
const mockedBrowser = jest.mocked(WebBrowser.openAuthSessionAsync);

function supabaseMock(options: { roles?: string[]; errorCode?: string | null; oauthError?: Error; sessionError?: Error } = {}) {
  const signOut = jest.fn().mockResolvedValue({ error: null });
  const client = {
    auth: {
      signInWithOAuth: options.oauthError ? jest.fn().mockRejectedValue(options.oauthError) : jest.fn().mockResolvedValue({ data: { url: 'https://accounts.google.test' }, error: null }),
      exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue(options.sessionError ? { data: { session: null }, error: options.sessionError } : { data: { session: { user: { id: 'user-1', email: 'person@test.invalid', user_metadata: { full_name: 'Pessoa Teste' } } } }, error: null }),
      signOut,
    },
    rpc: jest.fn().mockResolvedValue({ data: [{ access_roles: options.roles ?? ['participant'], error_code: options.errorCode ?? null }], error: null }),
    from: jest.fn((table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({
      data: table === 'profiles'
        ? { display_name: 'Pessoa Persistida', avatar_url: null }
        : { larger_text: false, high_contrast: true, auto_audio: false, voice_response: true, onboarding_completed_at: '2026-01-01T00:00:00Z' },
      error: null,
    }) }) }) })),
  };
  mockedGetSupabase.mockReturnValue(client as never);
  return client;
}

describe('Google authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  });

  it('exchanges a successful callback and returns only server roles', async () => {
    const client = supabaseMock({ roles: ['participant', 'admin'] });
    mockedBrowser.mockResolvedValue({ type: 'success', url: 'celularsemmedo://auth/callback?code=valid' } as never);
    await expect(signInWithGoogle()).resolves.toMatchObject({
      roles: ['participant', 'admin'],
      user: { name: 'Pessoa Persistida' },
      preferences: { largerText: false, highContrast: true, autoAudio: false, voiceResponse: true, audioRate: 0.9, reduceMotion: false, hapticFeedback: true, repeatInstructions: false },
      participantOnboardingCompleted: true,
    });
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('valid');
  });

  it.each(['cancel', 'dismiss'] as const)('maps browser %s to cancelled', async (type) => {
    supabaseMock(); mockedBrowser.mockResolvedValue({ type } as never);
    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'cancelled' });
  });

  it('maps access denied without creating a session', async () => {
    const client = supabaseMock();
    mockedBrowser.mockResolvedValue({ type: 'success', url: 'celularsemmedo://auth/callback?error=access_denied' } as never);
    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'access_denied' });
    expect(client.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('rejects a successful callback without an authorization code', async () => {
    supabaseMock(); mockedBrowser.mockResolvedValue({ type: 'success', url: 'celularsemmedo://auth/callback' } as never);
    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'temporary_failure' });
  });

  it('rejects an unexpected browser result', async () => {
    supabaseMock(); mockedBrowser.mockResolvedValue({ type: 'locked' } as never);
    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'temporary_failure' });
  });

  it('treats a missing provider URL as invalid configuration', async () => {
    const client = supabaseMock();
    client.auth.signInWithOAuth.mockResolvedValueOnce({ data: { url: null }, error: null });
    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'invalid_configuration' });
  });

  it('maps network errors to offline', async () => {
    supabaseMock({ oauthError: new Error('Network request failed') });
    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'offline' });
  });

  it.each([
    ['ACCOUNT_BLOCKED', 'account_blocked'],
    ['ACCOUNT_NOT_PROVISIONED', 'not_provisioned'],
  ])('rejects backend state %s', async (errorCode, expectedCode) => {
    const client = supabaseMock({ roles: [], errorCode });
    await expect(exchangeGoogleCode('valid')).rejects.toEqual(new GoogleAuthError(expectedCode as never));
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
