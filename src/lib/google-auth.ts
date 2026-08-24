import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { Role } from '@/context/AppContext';
import { getSupabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export type GoogleAuthErrorCode = 'cancelled' | 'access_denied' | 'invalid_configuration' | 'no_access' | 'unexpected';

export class GoogleAuthError extends Error {
  constructor(public code: GoogleAuthErrorCode) {
    super(code);
  }
}

export async function signInWithGoogle(): Promise<Role[]> {
  try {
    const supabase = getSupabase();
    const redirectTo = Platform.OS === 'web'
      ? `${globalThis.location.origin}/auth/callback`
      : Linking.createURL('auth/callback', { scheme: 'celularsemmedo' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        scopes: 'openid email profile',
      },
    });
    if (error || !data.url) throw new GoogleAuthError('invalid_configuration');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'cancel' || result.type === 'dismiss') throw new GoogleAuthError('cancelled');
    if (result.type !== 'success') throw new GoogleAuthError('unexpected');

    const callback = new URL(result.url);
    if (callback.searchParams.get('error') === 'access_denied') throw new GoogleAuthError('access_denied');
    const code = callback.searchParams.get('code');
    if (!code) throw new GoogleAuthError('unexpected');
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw new GoogleAuthError('unexpected');

    const allowedRoles = await getCurrentRoles();
    if (!allowedRoles.length) {
      await supabase.auth.signOut();
      throw new GoogleAuthError('no_access');
    }
    return allowedRoles;
  } catch (error) {
    if (error instanceof GoogleAuthError) throw error;
    throw new GoogleAuthError('invalid_configuration');
  }
}

export async function getCurrentRoles(): Promise<Role[]> {
  const { data: roles, error } = await getSupabase().rpc('get_my_access_roles');
  if (error) throw new GoogleAuthError('unexpected');
  return [...new Set((roles ?? []).map((item) => item.access_role).filter(isRole))];
}

export async function signOutFromGoogle() {
  await getSupabase().auth.signOut({ scope: 'local' });
}

function isRole(value: unknown): value is Role {
  return value === 'participant' || value === 'monitor' || value === 'admin';
}
