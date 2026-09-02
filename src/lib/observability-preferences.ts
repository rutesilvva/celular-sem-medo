import AsyncStorage from '@react-native-async-storage/async-storage';

import { configureObservabilityIdentity, configureObservabilityOptOut } from '@/lib/observability';

const optOutKey = 'csm-observability-opt-out-v1';
const identityKey = 'csm-observability-pseudonym-v1';

export async function initializeObservabilityPreference() {
  const [storedOptOut, storedIdentity] = await Promise.all([AsyncStorage.getItem(optOutKey), AsyncStorage.getItem(identityKey)]);
  const identity = storedIdentity ?? createUuid();
  if (!storedIdentity) await AsyncStorage.setItem(identityKey, identity);
  const optedOut = storedOptOut === 'true';
  configureObservabilityIdentity(identity);
  configureObservabilityOptOut(optedOut);
  return { optedOut, identity };
}

export async function setObservabilityOptOut(optedOut: boolean) {
  await AsyncStorage.setItem(optOutKey, String(optedOut));
  configureObservabilityOptOut(optedOut);
}

function createUuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => { const random = Math.floor(Math.random() * 16); return (character === 'x' ? random : (random & 3) | 8).toString(16); }); }
