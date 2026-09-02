import * as WebBrowser from 'expo-web-browser';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { AccessibilityPreferences, Role } from '@/context/AppContext';
import { canSelectRole } from '@/features/auth/authorization';
import { GoogleAuthError, loadAuthenticatedAccount } from '@/lib/google-auth';
import type { AuthenticatedAccount, AuthenticatedUser, GoogleAuthErrorCode } from '@/lib/google-auth';
import { clearStoredSession, getSupabase } from '@/lib/supabase';
import { clearAccountCache, readAccountCache, writeAccountCache } from '@/lib/account-cache';

export type AuthStatus = 'bootstrapping' | 'anonymous' | 'authenticated' | 'refreshing';

type AuthContextValue = {
  status: AuthStatus;
  errorCode: GoogleAuthErrorCode | null;
  sessionRole: Role | null;
  availableRoles: Role[];
  currentUser: AuthenticatedUser | null;
  authenticatedPreferences: AccessibilityPreferences | null;
  participantOnboardingCompleted: boolean;
  acceptAuthenticatedAccount: (account: AuthenticatedAccount) => void;
  selectSessionRole: (role: Role) => boolean;
  completeParticipantOnboarding: (preferences: AccessibilityPreferences) => Promise<boolean>;
  retrySessionRestore: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const refreshMarginMs = 60_000;
const logoutTimeoutMs = 5_000;

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('bootstrapping');
  const [errorCode, setErrorCode] = useState<GoogleAuthErrorCode | null>(null);
  const [sessionRole, setSessionRole] = useState<Role | null>(null);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authenticatedPreferences, setAuthenticatedPreferences] = useState<AccessibilityPreferences | null>(null);
  const [participantOnboardingCompleted, setParticipantOnboardingCompleted] = useState(false);
  const refreshPromise = useRef<Promise<'refreshed' | 'offline' | 'invalid'> | null>(null);
  const mounted = useRef(true);

  const clearAuthState = useCallback((nextError: GoogleAuthErrorCode | null = null) => {
    if (!mounted.current) return;
    setSessionRole(null);
    setAvailableRoles([]);
    setCurrentUser(null);
    setAuthenticatedPreferences(null);
    setParticipantOnboardingCompleted(false);
    setErrorCode(nextError);
    setStatus('anonymous');
  }, []);

  const acceptAuthenticatedAccount = useCallback((account: AuthenticatedAccount) => {
    if (!mounted.current) return;
    setAvailableRoles(account.roles);
    setCurrentUser(account.user);
    setAuthenticatedPreferences(account.preferences);
    setParticipantOnboardingCompleted(account.participantOnboardingCompleted);
    setErrorCode(null);
    if (account.roles.length === 1) setSessionRole(account.roles[0]!);
    else setSessionRole(null);
    setStatus('authenticated');
    void writeAccountCache(account);
  }, []);

  const refreshOnce = useCallback(() => {
    if (refreshPromise.current) return refreshPromise.current;
    setStatus('refreshing');
    refreshPromise.current = getSupabase().auth.refreshSession().then(({ data, error }) => {
      if (error) return isNetworkError(error) ? 'offline' : 'invalid';
      return data.session ? 'refreshed' : 'invalid';
    }).catch((error) => isNetworkError(error) ? 'offline' as const : 'invalid' as const).finally(() => {
      refreshPromise.current = null;
    });
    return refreshPromise.current;
  }, []);

  const restoreSession = useCallback(async () => {
    setStatus('bootstrapping');
    setErrorCode(null);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        clearAuthState();
        return;
      }
      const expiresAtMs = (data.session.expires_at ?? 0) * 1000;
      if (expiresAtMs <= Date.now() + refreshMarginMs) {
        const refreshResult = await refreshOnce();
        if (refreshResult === 'offline') throw new GoogleAuthError('offline');
        if (refreshResult === 'invalid') {
          await clearStoredSession();
          clearAuthState();
          return;
        }
      }
      acceptAuthenticatedAccount(await loadAuthenticatedAccount());
    } catch (error) {
      const code = error instanceof GoogleAuthError ? error.code : isNetworkError(error) ? 'offline' : 'temporary_failure';
      if (code === 'offline') {
        const cachedAccount = await readAccountCache();
        if (cachedAccount) { acceptAuthenticatedAccount(cachedAccount); return; }
      }
      // Sem rede preservamos a credencial no storage para permitir nova tentativa.
      if (code !== 'offline') { await clearStoredSession(); await clearAccountCache(); }
      clearAuthState(code);
    }
  }, [acceptAuthenticatedAccount, clearAuthState, refreshOnce]);

  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => void restoreSession());
    const { data: listener } = getSupabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') clearAuthState();
      if (event === 'TOKEN_REFRESHED') {
        setStatus('refreshing');
        queueMicrotask(() => {
          void loadAuthenticatedAccount()
            .then(acceptAuthenticatedAccount)
            .catch((error: unknown) => {
              const code = error instanceof GoogleAuthError ? error.code : isNetworkError(error) ? 'offline' : 'temporary_failure';
              clearAuthState(code);
            });
        });
      }
    });
    return () => {
      mounted.current = false;
      listener.subscription.unsubscribe();
    };
  }, [acceptAuthenticatedAccount, clearAuthState, restoreSession]);

  const selectSessionRole = useCallback((nextRole: Role) => {
    if (!canSelectRole(status, availableRoles, nextRole)) return false;
    setSessionRole(nextRole);
    return true;
  }, [availableRoles, status]);

  const completeParticipantOnboarding = useCallback(async (preferences: AccessibilityPreferences) => {
    if (!currentUser || !availableRoles.includes('participant')) return false;
    const { error } = await getSupabase().from('preferences').update({
      larger_text: preferences.largerText,
      high_contrast: preferences.highContrast,
      auto_audio: preferences.autoAudio,
      voice_response: preferences.voiceResponse,
      audio_rate: preferences.audioRate,
      reduce_motion: preferences.reduceMotion,
      haptic_feedback: preferences.hapticFeedback,
      repeat_instructions: preferences.repeatInstructions,
      onboarding_completed_at: new Date().toISOString(),
    }).eq('user_id', currentUser.id);
    if (error) return false;
    setAuthenticatedPreferences(preferences);
    setParticipantOnboardingCompleted(true);
    return true;
  }, [availableRoles, currentUser]);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    let timeout: ReturnType<typeof setTimeout> | null = null;
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: 'global' }),
        new Promise((resolve) => { timeout = setTimeout(resolve, logoutTimeoutMs); }),
      ]);
    } catch {
      // O logout local permanece obrigatório mesmo sem rede ou backend.
    } finally {
      if (timeout) clearTimeout(timeout);
      supabase.auth.stopAutoRefresh();
      await clearStoredSession();
      await clearAccountCache();
      if (Platform.OS !== 'web') {
        try {
          WebBrowser.dismissAuthSession();
        } catch {
          // O navegador de autenticação já pode estar fechado.
        }
      }
      clearAuthState();
    }
  }, [clearAuthState]);

  const value = useMemo(() => ({
    status,
    errorCode,
    sessionRole,
    availableRoles,
    currentUser,
    authenticatedPreferences,
    participantOnboardingCompleted,
    acceptAuthenticatedAccount,
    selectSessionRole,
    completeParticipantOnboarding,
    retrySessionRestore: restoreSession,
    signOut,
  }), [
    acceptAuthenticatedAccount,
    availableRoles,
    completeParticipantOnboarding,
    currentUser,
    authenticatedPreferences,
    errorCode,
    participantOnboardingCompleted,
    restoreSession,
    selectSessionRole,
    sessionRole,
    signOut,
    status,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function useOptionalAuth() {
  return useContext(AuthContext);
}

function isNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /network request failed|failed to fetch|networkerror|load failed/i.test(message);
}
