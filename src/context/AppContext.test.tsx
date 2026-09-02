import { act, renderHook, waitFor } from '@testing-library/react-native';

import { AppProvider, useApp } from './AppContext';
import { useOptionalAuth } from './AuthContext';
import { saveParticipantPreferences } from '@/lib/backend';
import { readPreferencesCache, writePreferencesCache } from '@/lib/preferences-cache';

jest.mock('./AuthContext', () => ({ useOptionalAuth: jest.fn() }));
jest.mock('@/lib/backend', () => ({ saveParticipantPreferences: jest.fn() }));
jest.mock('@/lib/preferences-cache', () => ({ readPreferencesCache: jest.fn(), writePreferencesCache: jest.fn() }));

const serverPreferences = { largerText: false, highContrast: true, autoAudio: false, voiceResponse: true, audioRate: 0.9 };

describe('AppProvider preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useOptionalAuth).mockReturnValue(null);
    jest.mocked(readPreferencesCache).mockResolvedValue(null);
    jest.mocked(writePreferencesCache).mockResolvedValue();
    jest.mocked(saveParticipantPreferences).mockResolvedValue();
  });

  it('updates accessibility preferences without changing the other values', () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    act(() => result.current.setPreference('highContrast', true));
    expect(result.current.preferences).toEqual({ largerText: true, highContrast: true, autoAudio: true, voiceResponse: false, audioRate: 0.9 });
  });

  it('protects the current administrator and permits removing another user', () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    const current = result.current.managedUsers.find((user) => user.currentUser)!;
    expect(result.current.removeManagedUser(current.id)).toBe(false);
    const removable = result.current.managedUsers.find((user) => !user.currentUser)!;
    act(() => { expect(result.current.removeManagedUser(removable.id)).toBe(true); });
    expect(result.current.managedUsers.some((user) => user.id === removable.id)).toBe(false);
  });

  it('shows and automatically clears feedback', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    act(() => result.current.showNotice('Salvo'));
    expect(result.current.notice).toBe('Salvo');
    act(() => jest.advanceTimersByTime(2400));
    expect(result.current.notice).toBeNull();
    jest.useRealTimers();
  });

  it('hydrates the preferences returned by the authenticated account', async () => {
    jest.mocked(useOptionalAuth).mockReturnValue(authState(serverPreferences) as never);
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    await waitFor(() => expect(result.current.preferencesReady).toBe(true));
    expect(result.current.preferences).toEqual(serverPreferences);
    expect(writePreferencesCache).toHaveBeenCalledWith('user-1', serverPreferences);
  });

  it('synchronizes a changed preference with the authenticated account', async () => {
    jest.mocked(useOptionalAuth).mockReturnValue(authState(serverPreferences) as never);
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    await waitFor(() => expect(result.current.preferencesReady).toBe(true));
    act(() => result.current.setPreference('largerText', true));
    await waitFor(() => expect(result.current.preferencesSyncStatus).toBe('idle'));
    expect(saveParticipantPreferences).toHaveBeenCalledWith('user-1', { ...serverPreferences, largerText: true });
  });

  it('uses the secure last-known value when the account response has no preferences', async () => {
    const cached = { ...serverPreferences, voiceResponse: false };
    jest.mocked(useOptionalAuth).mockReturnValue(authState(null) as never);
    jest.mocked(readPreferencesCache).mockResolvedValue(cached);
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    await waitFor(() => expect(result.current.preferencesReady).toBe(true));
    expect(result.current.preferences).toEqual(cached);
  });

  it('keeps the last local value and offers retry when synchronization fails', async () => {
    jest.mocked(useOptionalAuth).mockReturnValue(authState(serverPreferences) as never);
    jest.mocked(saveParticipantPreferences).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    await waitFor(() => expect(result.current.preferencesReady).toBe(true));
    act(() => result.current.setPreference('autoAudio', true));
    await waitFor(() => expect(result.current.preferencesSyncStatus).toBe('error'));
    expect(result.current.preferences.autoAudio).toBe(true);
    expect(writePreferencesCache).toHaveBeenLastCalledWith('user-1', { ...serverPreferences, autoAudio: true });
    act(() => result.current.retryPreferencesSync());
    await waitFor(() => expect(result.current.preferencesSyncStatus).toBe('idle'));
  });
});

function authState(preferences: typeof serverPreferences | null) {
  return {
    status: 'authenticated',
    currentUser: { id: 'user-1' },
    authenticatedPreferences: preferences,
  };
}
