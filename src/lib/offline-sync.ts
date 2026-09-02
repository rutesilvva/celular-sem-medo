import NetInfo from '@react-native-community/netinfo';

import { appendAttemptEvent, setMissionAttemptProgress, startOrResumeMissionAttempt } from '@/lib/backend';
import { markOfflineEventSynced, readOfflineAttempt, writeOfflineAttempt, type OfflineAttempt } from '@/lib/offline-store';

const activeSyncs = new Map<string, Promise<OfflineAttempt | null>>();

export async function synchronizeOfflineAttempt(
  ownerId: string,
  assignmentId: string,
  onProgress?: (attempt: OfflineAttempt) => void,
): Promise<OfflineAttempt | null> {
  const lockKey = `${ownerId}:${assignmentId}`;
  const existing = activeSyncs.get(lockKey);
  if (existing) return existing;

  const task = runSynchronization(ownerId, assignmentId, onProgress).finally(() => activeSyncs.delete(lockKey));
  activeSyncs.set(lockKey, task);
  return task;
}

async function runSynchronization(ownerId: string, assignmentId: string, onProgress?: (attempt: OfflineAttempt) => void) {
  const network = await NetInfo.fetch();
  if (!network.isConnected || network.isInternetReachable === false) return null;
  let working = await readOfflineAttempt(ownerId, assignmentId);
  if (!working || working.ownerId !== ownerId || !working.pending.length) return working;

  const remote = await startOrResumeMissionAttempt(working.assignmentId, working.localAttemptId);
  working = { ...working, remoteAttemptId: remote.attempt_id, remoteNextSequence: working.remoteNextSequence ?? remote.next_sequence_number };
  await persist(working, onProgress);

  for (const operation of [...working.pending]) {
    const sequence = working.remoteNextSequence ?? 1;
    await appendAttemptEvent({
      eventId: eventUuid(working.remoteAttemptId!, sequence),
      attemptId: working.remoteAttemptId!,
      sequenceNumber: sequence,
      eventType: operation.eventType,
      stepId: operation.stepId,
      occurredAt: operation.occurredAt,
    });
    if (operation.progressStepId) {
      await setMissionAttemptProgress({ attemptId: working.remoteAttemptId!, stepId: operation.progressStepId, completed: operation.completed });
    }
    working = markOfflineEventSynced(working, operation.operationId, working.remoteAttemptId!, sequence + 1);
    await persist(working, onProgress);
  }
  return working;
}

async function persist(attempt: OfflineAttempt, onProgress?: (attempt: OfflineAttempt) => void) {
  await writeOfflineAttempt(attempt);
  onProgress?.(attempt);
}

function eventUuid(attemptId: string, sequence: number) {
  const suffix = sequence.toString(16).padStart(12, '0').slice(-12);
  return `${attemptId.slice(0, 24)}${suffix}`;
}
