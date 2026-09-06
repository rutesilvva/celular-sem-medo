import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const storageKey = 'csm-pending-invitation-v1';

export async function savePendingInvitation(token: string) {
  if (!/^[0-9a-f]{64}$/i.test(token)) throw new Error('INVALID_INVITATION_TOKEN');
  if (Platform.OS === 'web') globalThis.sessionStorage?.setItem(storageKey, token);
  else await SecureStore.setItemAsync(storageKey, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function readPendingInvitation() {
  return Platform.OS === 'web' ? globalThis.sessionStorage?.getItem(storageKey) ?? null : SecureStore.getItemAsync(storageKey);
}

export async function clearPendingInvitation() {
  if (Platform.OS === 'web') globalThis.sessionStorage?.removeItem(storageKey);
  else await SecureStore.deleteItemAsync(storageKey);
}
