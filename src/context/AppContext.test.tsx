import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Speech from 'expo-speech';

import { AppProvider, useApp } from './AppContext';
import { useOptionalAuth } from './AuthContext';
import { saveParticipantPreferences } from '@/lib/backend';
import { readPreferencesCache, writePreferencesCache } from '@/lib/preferences-cache';

jest.mock('./AuthContext', () => ({ useOptionalAuth: jest.fn() }));
jest.mock('@/lib/backend', () => ({ saveParticipantPreferences: jest.fn() }));
jest.mock('@/lib/preferences-cache', () => ({ readPreferencesCache: jest.fn(), writePreferencesCache: jest.fn() }));
jest.mock('expo-speech', () => ({
  getAvailableVoicesAsync: jest.fn(),
  maxSpeechInputLength: 4000,
  pause: jest.fn(),
  resume: jest.fn(),
  speak: jest.fn(),
  stop: jest.fn(),
}));

const serverPreferences = { largerText: false, highContrast: true, autoAudio: false, voiceResponse: true, audioRate: 0.9, reduceMotion: false, hapticFeedback: true, repeatInstructions: false };

describe('AppProvider preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useOptionalAuth).mockReturnValue(null);
    jest.mocked(readPreferencesCache).mockResolvedValue(null);
    jest.mocked(writePreferencesCache).mockResolvedValue();
    jest.mocked(saveParticipantPreferences).mockResolvedValue();
    jest.mocked(Speech.stop).mockResolvedValue();
    jest.mocked(Speech.getAvailableVoicesAsync).mockResolvedValue([]);
  });

  it('updates accessibility preferences without changing the other values', () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    act(() => result.current.setPreference('highContrast', true));
    expect(result.current.preferences).toEqual({ largerText: true, highContrast: true, autoAudio: false, voiceResponse: false, audioRate: 0.9, reduceMotion: false, hapticFeedback: true, repeatInstructions: false });
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

  it('clears account-owned preferences after logout', async () => {
    jest.mocked(useOptionalAuth).mockReturnValue(authState(serverPreferences) as never);
    const { result, rerender } = renderHook(() => useApp(), { wrapper: AppProvider });
    await waitFor(() => expect(result.current.preferencesReady).toBe(true));
    jest.mocked(useOptionalAuth).mockReturnValue(null);
    rerender(undefined);
    await waitFor(() => expect(result.current.preferences).toEqual(expect.objectContaining({ autoAudio: false, voiceResponse: false })));
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

  it('plays an instruction and returns to idle after completion', async () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    act(() => result.current.playInstruction('Leia com calma'));
    await waitFor(() => expect(Speech.speak).toHaveBeenCalled());
    const options = jest.mocked(Speech.speak).mock.calls[0]![1]!;
    act(() => options.onStart?.());
    expect(result.current.audioStatus).toBe('speaking');
    act(() => options.onDone?.());
    expect(result.current.audioStatus).toBe('idle');
    expect(result.current.audioMessage).toBeNull();
    act(() => options.onStopped?.());
  });

  it('reports when a Portuguese voice is unavailable', async () => {
    jest.mocked(Speech.getAvailableVoicesAsync).mockResolvedValue([{ identifier: 'english', language: 'en-US', name: 'English', quality: 'Default' }] as never);
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    act(() => result.current.playInstruction());
    await waitFor(() => expect(result.current.audioStatus).toBe('error'));
    expect(result.current.audioError).toContain('português');
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('repeats the instruction when the preference is enabled', async () => {
    jest.mocked(Speech.getAvailableVoicesAsync).mockResolvedValue([{ identifier: 'pt', language: 'pt-BR', name: 'Português', quality: 'Default' }] as never);
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    act(() => result.current.setPreference('repeatInstructions', true));
    act(() => result.current.playInstruction('Repita'));
    await waitFor(() => expect(Speech.speak).toHaveBeenCalledTimes(1));
    act(() => jest.mocked(Speech.speak).mock.calls[0]![1]!.onDone?.());
    expect(Speech.speak).toHaveBeenCalledTimes(2);
    act(() => jest.mocked(Speech.speak).mock.calls[1]![1]!.onDone?.());
    expect(result.current.audioStatus).toBe('idle');
  });

  it('supports pause, resume, stop and replay controls', async () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    act(() => result.current.playInstruction('Controle de áudio'));
    await waitFor(() => expect(Speech.speak).toHaveBeenCalled());
    act(() => result.current.pauseInstruction());
    expect(result.current.audioStatus).toBe('paused');
    act(() => result.current.resumeInstruction());
    act(() => result.current.repeatInstruction());
    await waitFor(() => expect(Speech.speak).toHaveBeenCalledTimes(2));
    act(() => result.current.stopInstruction());
    expect(result.current.audioStatus).toBe('idle');
    expect(result.current.audioError).toBeNull();
  });

  it('keeps the transcript available when speech setup fails', async () => {
    jest.mocked(Speech.stop).mockRejectedValueOnce(new Error('speech unavailable'));
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    act(() => result.current.playInstruction('Texto disponível'));
    await waitFor(() => expect(result.current.audioStatus).toBe('error'));
    expect(result.current.audioMessage).toBe('Texto disponível');
  });

  it('exposes a recoverable state when the speech engine reports an error', async () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    act(() => result.current.playInstruction('Ainda pode ser lido'));
    await waitFor(() => expect(Speech.speak).toHaveBeenCalled());
    act(() => jest.mocked(Speech.speak).mock.calls[0]![1]!.onError?.({} as never));
    expect(result.current.audioStatus).toBe('error');
    expect(result.current.audioMessage).toBe('Ainda pode ser lido');
  });
});

function authState(preferences: typeof serverPreferences | null) {
  return {
    status: 'authenticated',
    currentUser: { id: 'user-1' },
    authenticatedPreferences: preferences,
  };
}
