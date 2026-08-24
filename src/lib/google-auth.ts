import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { Role } from '@/context/AppContext';
import { getSupabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export type GoogleAuthErrorCode =
  | 'cancelled'
  | 'access_denied'
  | 'invalid_configuration'
  | 'not_provisioned'
  | 'account_blocked'
  | 'offline'
  | 'temporary_failure';

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type AuthenticatedAccount = {
  roles: Role[];
  user: AuthenticatedUser;
  participantOnboardingCompleted: boolean;
};

export class GoogleAuthError extends Error {
  constructor(public code: GoogleAuthErrorCode) {
    super(code);
    this.name = 'GoogleAuthError';
  }
}

export async function signInWithGoogle(): Promise<AuthenticatedAccount | null> {
  try {
    const supabase = getSupabase();
    const redirectTo = getRedirectUrl();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== 'web',
        scopes: 'openid email profile',
      },
    });
    if (error) throw error;
    if (!data.url) throw new GoogleAuthError('invalid_configuration');

    if (Platform.OS === 'web') return null;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'cancel' || result.type === 'dismiss') throw new GoogleAuthError('cancelled');
    if (result.type !== 'success') throw new GoogleAuthError('temporary_failure');

    const callback = new URL(result.url);
    if (callback.searchParams.get('error') === 'access_denied') throw new GoogleAuthError('access_denied');
    const code = callback.searchParams.get('code');
    if (!code) throw new GoogleAuthError('temporary_failure');
    return exchangeGoogleCode(code);
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function exchangeGoogleCode(code: string): Promise<AuthenticatedAccount> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return loadAuthenticatedAccount();
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function loadAuthenticatedAccount(): Promise<AuthenticatedAccount> {
  const supabase = getSupabase();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.user) throw new GoogleAuthError('temporary_failure');

  const authContext = await getCurrentAuthContext();
  if (authContext.errorCode === 'ACCOUNT_BLOCKED') {
    await supabase.auth.signOut({ scope: 'local' });
    throw new GoogleAuthError('account_blocked');
  }
  if (authContext.errorCode || !authContext.roles.length) {
    await supabase.auth.signOut({ scope: 'local' });
    throw new GoogleAuthError('not_provisioned');
  }

  const authUser = sessionData.session.user;
  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_url').eq('id', authUser.id).maybeSingle(),
    supabase.from('preferences').select('onboarding_completed_at').eq('user_id', authUser.id).maybeSingle(),
  ]);
  const metadata = authUser.user_metadata;
  const metadataName = typeof metadata.full_name === 'string' ? metadata.full_name : null;
  const metadataAvatar = typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null;

  return {
    roles: authContext.roles,
    user: {
      id: authUser.id,
      name: profile?.display_name || metadataName || 'Pessoa usuária',
      email: authUser.email ?? '',
      avatarUrl: profile?.avatar_url || metadataAvatar,
    },
    participantOnboardingCompleted: Boolean(preferences?.onboarding_completed_at),
  };
}

export async function getCurrentAuthContext(): Promise<{ roles: Role[]; errorCode: string | null }> {
  const { data, error } = await getSupabase().rpc('get_my_auth_context');
  if (error) throw normalizeAuthError(error);
  if (!data?.[0]) return { roles: [], errorCode: 'ACCOUNT_NOT_PROVISIONED' };
  return {
    roles: [...new Set(data[0].access_roles.filter(isRole))],
    errorCode: data[0].error_code,
  };
}

export async function signOutFromGoogle() {
  await getSupabase().auth.signOut({ scope: 'local' });
}

function getRedirectUrl() {
  return Platform.OS === 'web'
    ? `${globalThis.location.origin}/auth/callback`
    : Linking.createURL('auth/callback', { scheme: 'celularsemmedo' });
}

function normalizeAuthError(error: unknown): GoogleAuthError {
  if (error instanceof GoogleAuthError) return error;
  if (isOffline() || hasNetworkError(error)) return new GoogleAuthError('offline');
  return new GoogleAuthError('temporary_failure');
}

function isOffline() {
  return Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false;
}

function hasNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /network request failed|failed to fetch|networkerror|load failed/i.test(message);
}

function isRole(value: unknown): value is Role {
  return value === 'participant' || value === 'monitor' || value === 'admin';
}
