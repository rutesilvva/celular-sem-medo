import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PublicDemoMission } from './catalog';

const STORAGE_KEY = 'celular-sem-medo:public-demo-progress:v1';

export type PublicDemoProgress = {
  completedMissionKeys: PublicDemoMission['key'][];
  updatedAt: string | null;
};

const emptyProgress: PublicDemoProgress = { completedMissionKeys: [], updatedAt: null };

export async function readPublicDemoProgress(): Promise<PublicDemoProgress> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyProgress;
  try {
    const parsed = JSON.parse(raw) as Partial<PublicDemoProgress>;
    return {
      completedMissionKeys: Array.isArray(parsed.completedMissionKeys)
        ? [...new Set(parsed.completedMissionKeys.filter((key): key is PublicDemoMission['key'] => typeof key === 'string'))]
        : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    };
  } catch {
    return emptyProgress;
  }
}

export async function recordPublicDemoCompletion(key: PublicDemoMission['key']) {
  const current = await readPublicDemoProgress();
  const next: PublicDemoProgress = {
    completedMissionKeys: [...new Set([...current.completedMissionKeys, key])],
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function clearPublicDemoProgress() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
