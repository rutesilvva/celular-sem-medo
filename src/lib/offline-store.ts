import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MissionRunState } from '@/features/mission-engine/executor';
import type { ParticipantMission, ParticipantMissionDetails, ParticipantMissionStep } from '@/lib/backend';

export type OfflineMissionEvent = {
  operationId: string;
  eventType: 'attempt_started' | 'attempt_resumed' | 'action_succeeded' | 'action_failed' | 'hint_requested' | 'help_requested' | 'audio_started' | 'attempt_completed';
  stepId?: string;
  occurredAt: string;
  progressStepId?: string;
  completed?: boolean;
};

export type OfflineAttempt = {
  ownerId: string;
  assignmentId: string;
  localAttemptId: string;
  remoteAttemptId: string | null;
  remoteNextSequence: number | null;
  run: MissionRunState;
  pending: OfflineMissionEvent[];
  syncedOperationIds: string[];
  updatedAt: string;
};

type MissionContent = { details: ParticipantMissionDetails; steps: ParticipantMissionStep[] };
const namespace = 'csm-offline-v1';
const key = (ownerId: string, kind: string) => `${namespace}:${ownerId}:${kind}`;

export async function cacheMissionCatalog(ownerId: string, catalog: ParticipantMission[]) {
  await AsyncStorage.setItem(key(ownerId, 'catalog'), JSON.stringify(catalog));
}
export async function readMissionCatalog(ownerId: string): Promise<ParticipantMission[] | null> {
  return readJson(key(ownerId, 'catalog'));
}
export async function cacheMissionContent(ownerId: string, assignmentId: string, content: MissionContent) {
  await AsyncStorage.setItem(key(ownerId, `mission:${assignmentId}`), JSON.stringify(content));
}
export async function readMissionContent(ownerId: string, assignmentId: string): Promise<MissionContent | null> {
  return readJson(key(ownerId, `mission:${assignmentId}`));
}
export async function readOfflineAttempt(ownerId: string, assignmentId: string): Promise<OfflineAttempt | null> {
  const value = await readJson<OfflineAttempt>(key(ownerId, `attempt:${assignmentId}`));
  return value?.ownerId === ownerId ? value : null;
}
export async function writeOfflineAttempt(attempt: OfflineAttempt) {
  await AsyncStorage.setItem(key(attempt.ownerId, `attempt:${attempt.assignmentId}`), JSON.stringify(attempt));
}
export async function listOfflineAttempts(ownerId: string): Promise<OfflineAttempt[]> {
  const prefix=`${namespace}:${ownerId}:attempt:`;
  try { const keys=(await AsyncStorage.getAllKeys()).filter(item=>item.startsWith(prefix));const pairs=await AsyncStorage.multiGet(keys);return pairs.flatMap(([,value])=>{if(!value)return[];try{const parsed=JSON.parse(value) as OfflineAttempt;return parsed.ownerId===ownerId?[parsed]:[]}catch{return[]}}); } catch { return []; }
}
export async function removeOfflineAttempt(ownerId: string, assignmentId: string) {
  await AsyncStorage.removeItem(key(ownerId, `attempt:${assignmentId}`));
}
export function enqueueOfflineEvent(attempt: OfflineAttempt, event: OfflineMissionEvent): OfflineAttempt {
  if (attempt.pending.some((item) => item.operationId === event.operationId) || attempt.syncedOperationIds.includes(event.operationId)) return attempt;
  return { ...attempt, pending: [...attempt.pending, event], updatedAt: new Date().toISOString() };
}
export function markOfflineEventSynced(attempt: OfflineAttempt, operationId: string, remoteAttemptId: string, nextSequence: number): OfflineAttempt {
  return { ...attempt, remoteAttemptId, remoteNextSequence: nextSequence, pending: attempt.pending.filter((item) => item.operationId !== operationId), syncedOperationIds: [...attempt.syncedOperationIds, operationId].slice(-200), updatedAt: new Date().toISOString() };
}
export function syncBackoffMs(retryCount: number) { return Math.min(30_000, 1_000 * (2 ** Math.max(0, retryCount - 1))); }
async function readJson<T>(storageKey: string): Promise<T | null> {
  try { const value = await AsyncStorage.getItem(storageKey); return value ? JSON.parse(value) as T : null; } catch { return null; }
}
