import { act, renderHook } from '@testing-library/react-native';

import { AppProvider, useApp } from './AppContext';

describe('AppProvider preferences', () => {
  it('updates accessibility preferences without changing the other values', () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    act(() => result.current.setPreference('highContrast', true));
    expect(result.current.preferences).toEqual({ largerText: true, highContrast: true, autoAudio: true, voiceResponse: false });
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
});
