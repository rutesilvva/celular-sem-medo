import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AccessibilityPreferences } from '@/context/AppContext';

const prefix = 'csm-preferences-v1';

export async function readPreferencesCache(userId: string): Promise<AccessibilityPreferences | null> {
  try {
    const value = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(cacheKey(userId))
      : await SecureStore.getItemAsync(cacheKey(userId));
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<AccessibilityPreferences>;
    if (!isBooleanPreferences(parsed)) return null;
    return { ...parsed, audioRate: typeof parsed.audioRate === 'number' ? parsed.audioRate : 0.9, reduceMotion: parsed.reduceMotion ?? false, hapticFeedback: parsed.hapticFeedback ?? true, repeatInstructions: parsed.repeatInstructions ?? false };
  } catch {
    return null;
  }
}

export async function writePreferencesCache(userId: string, preferences: AccessibilityPreferences) {
  try {
    const value = JSON.stringify(preferences);
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(cacheKey(userId), value);
    else await SecureStore.setItemAsync(cacheKey(userId), value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  } catch {
    // A configuração remota continua válida mesmo se o cache do dispositivo falhar.
  }
}

function cacheKey(userId: string) {
  return `${prefix}:${userId}`;
}

function isBooleanPreferences(value: Partial<AccessibilityPreferences>): value is AccessibilityPreferences {
  return typeof value.largerText === 'boolean'
    && typeof value.highContrast === 'boolean'
    && typeof value.autoAudio === 'boolean'
    && typeof value.voiceResponse === 'boolean';
}
