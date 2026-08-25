import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { readPreferencesCache, writePreferencesCache } from './preferences-cache';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

describe('preferences cache', () => {
  const preferences = { largerText: true, highContrast: false, autoAudio: true, voiceResponse: false };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  });

  it('stores only the preference payload under the user scope', async () => {
    await writePreferencesCache('user-1', preferences);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'csm-preferences-v1:user-1',
      JSON.stringify(preferences),
      expect.any(Object),
    );
  });

  it('restores a valid last-known configuration', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify(preferences));
    await expect(readPreferencesCache('user-1')).resolves.toEqual(preferences);
  });

  it('rejects malformed cache without exposing a partial configuration', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('{"largerText":true}');
    await expect(readPreferencesCache('user-1')).resolves.toBeNull();
  });

  it('returns no cache when secure storage is unavailable', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValue(new Error('locked'));
    await expect(readPreferencesCache('user-1')).resolves.toBeNull();
  });

  it('uses the browser storage without writing personal identity fields', async () => {
    const getItem = jest.fn().mockReturnValue(JSON.stringify(preferences));
    const setItem = jest.fn();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem, setItem } });
    await expect(readPreferencesCache('user-web')).resolves.toEqual(preferences);
    await writePreferencesCache('user-web', preferences);
    expect(setItem).toHaveBeenCalledWith('csm-preferences-v1:user-web', JSON.stringify(preferences));
  });
});
