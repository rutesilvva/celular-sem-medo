import 'react-native-url-polyfill/auto';

import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { getPublicConfig } from '@/lib/env';
import type { Database } from '@/types/database.generated';

const chunkSize = 1800;
const secureOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY } as const;

type StorageManifest = { generation: string; chunks: number };

const secureStorage = {
  async getItem(key: string) {
    const rawManifest = await SecureStore.getItemAsync(key);
    if (!rawManifest) return null;
    try {
      const manifest = JSON.parse(rawManifest) as StorageManifest;
      const chunks = await Promise.all(Array.from({ length: manifest.chunks }, (_, index) => (
        SecureStore.getItemAsync(`${key}.${manifest.generation}.${index}`)
      )));
      if (chunks.some((chunk) => chunk === null)) return null;
      return chunks.join('');
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    const previous = await readManifest(key);
    const generation = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const chunks = Array.from({ length: Math.ceil(value.length / chunkSize) }, (_, index) => value.slice(index * chunkSize, (index + 1) * chunkSize));
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(`${key}.${generation}.${index}`, chunk, secureOptions)));
    await SecureStore.setItemAsync(key, JSON.stringify({ generation, chunks: chunks.length }), secureOptions);
    if (previous) await removeChunks(key, previous);
  },
  async removeItem(key: string) {
    const manifest = await readManifest(key);
    await SecureStore.deleteItemAsync(key);
    if (manifest) await removeChunks(key, manifest);
  },
};

async function readManifest(key: string): Promise<StorageManifest | null> {
  try {
    const value = await SecureStore.getItemAsync(key);
    return value ? JSON.parse(value) as StorageManifest : null;
  } catch {
    return null;
  }
}

async function removeChunks(key: string, manifest: StorageManifest) {
  await Promise.all(Array.from({ length: manifest.chunks }, (_, index) => (
    SecureStore.deleteItemAsync(`${key}.${manifest.generation}.${index}`)
  )));
}

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;
  const config = getPublicConfig();
  client = createClient<Database>(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      storage: Platform.OS === 'web' ? globalThis.localStorage : secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  });
  return client;
}

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (!client) return;
    if (state === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
}
