import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { AuthProvider, useAuth } from './AuthContext';
import { loadAuthenticatedAccount } from '@/lib/google-auth';
import { clearStoredSession, getSupabase } from '@/lib/supabase';

jest.mock('@/lib/google-auth', () => ({
  GoogleAuthError: class GoogleAuthError extends Error {
    code: string;
    constructor(errorCode: string) { super(errorCode); this.code = errorCode; }
  },
  loadAuthenticatedAccount: jest.fn(),
}));
jest.mock('@/lib/supabase', () => ({ getSupabase: jest.fn(), clearStoredSession: jest.fn() }));
jest.mock('expo-web-browser', () => ({ dismissAuthSession: jest.fn() }));

const account = {
  roles: ['participant'] as const,
  user: { id: 'user-1', name: 'Pessoa', email: 'person@test.invalid', avatarUrl: null },
  preferences: { largerText: true, highContrast: false, autoAudio: true, voiceResponse: false, audioRate: 0.9 },
  participantOnboardingCompleted: false,
};
const wrapper = ({ children }: PropsWithChildren) => <AuthProvider>{children}</AuthProvider>;

describe('AuthProvider session lifecycle', () => {
  let authListener: (event: string) => void;
  let client: ReturnType<typeof createClientMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    client = createClientMock();
    jest.mocked(getSupabase).mockReturnValue(client as never);
    jest.mocked(loadAuthenticatedAccount).mockResolvedValue(account as never);
    client.auth.onAuthStateChange.mockImplementation((callback: (event: string) => void) => {
      authListener = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
  });

  it('finishes bootstrapping anonymously when no session exists', async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.status).toBe('bootstrapping');
    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    expect(result.current.currentUser).toBeNull();
  });

  it('restores a valid session and uses only the authorized role', async () => {
    client.auth.getSession.mockResolvedValue(validSession());
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.sessionRole).toBe('participant');
    expect(result.current.currentUser?.name).toBe('Pessoa');
  });

  it('refreshes an expiring session once before releasing protected routes', async () => {
    client.auth.getSession.mockResolvedValue(validSession(Math.floor(Date.now() / 1000)));
    client.auth.refreshSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(client.auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('rejects a role not returned by the backend and accepts an allowed role', async () => {
    client.auth.getSession.mockResolvedValue(validSession());
    jest.mocked(loadAuthenticatedAccount).mockResolvedValue({ ...account, roles: ['participant', 'admin'] } as never);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    act(() => expect(result.current.selectSessionRole('invalid' as never)).toBe(false));
    act(() => expect(result.current.selectSessionRole('admin')).toBe(true));
    expect(result.current.sessionRole).toBe('admin');
  });

  it('waits for role selection when the backend authorizes multiple roles', async () => {
    client.auth.getSession.mockResolvedValue(validSession());
    jest.mocked(loadAuthenticatedAccount).mockResolvedValue({ ...account, roles: ['participant', 'admin'] } as never);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.sessionRole).toBeNull();
  });

  it('returns to login and clears an invalid expired session', async () => {
    client.auth.getSession.mockResolvedValue(validSession(Math.floor(Date.now() / 1000)));
    client.auth.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('refresh revoked') });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    expect(clearStoredSession).toHaveBeenCalled();
  });

  it('preserves stored credentials when restoration fails offline', async () => {
    client.auth.getSession.mockRejectedValue(new Error('Failed to fetch'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.errorCode).toBe('offline'));
    expect(clearStoredSession).not.toHaveBeenCalled();
  });

  it('does not persist onboarding while anonymous', async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    await expect(result.current.completeParticipantOnboarding({ largerText: true, highContrast: false, autoAudio: true, voiceResponse: false, audioRate: 0.9 })).resolves.toBe(false);
  });

  it('persists onboarding preferences for the authenticated participant', async () => {
    client.auth.getSession.mockResolvedValue(validSession());
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    await act(() => result.current.completeParticipantOnboarding({ largerText: true, highContrast: true, autoAudio: false, voiceResponse: false, audioRate: 0.9 }));
    expect(client.from).toHaveBeenCalledWith('preferences');
    expect(result.current.participantOnboardingCompleted).toBe(true);
  });

  it('clears local state even when remote logout fails', async () => {
    client.auth.getSession.mockResolvedValue(validSession());
    client.auth.signOut.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    await act(() => result.current.signOut());
    expect(clearStoredSession).toHaveBeenCalled();
    expect(result.current.status).toBe('anonymous');
  });

  it('reacts to a backend sign-out event', async () => {
    client.auth.getSession.mockResolvedValue(validSession());
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    act(() => authListener('SIGNED_OUT'));
    expect(result.current.status).toBe('anonymous');
  });
});

function validSession(expiresAt = Math.floor(Date.now() / 1000) + 3600) {
  return { data: { session: { expires_at: expiresAt, user: { id: 'user-1' } } }, error: null };
}

function createClientMock() {
  const eq = jest.fn().mockResolvedValue({ error: null });
  const update = jest.fn(() => ({ eq }));
  return {
    auth: {
      getSession: jest.fn(), refreshSession: jest.fn(), onAuthStateChange: jest.fn(),
      signOut: jest.fn().mockResolvedValue({ error: null }), stopAutoRefresh: jest.fn(),
    },
    from: jest.fn(() => ({ update })),
  };
}
