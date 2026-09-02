import AsyncStorage from '@react-native-async-storage/async-storage';

import { completeMissionAssessment, startMissionAssessment } from '@/lib/backend';
import { readOfflineAttempt } from '@/lib/offline-store';

export type OfflineAssessment = {
  id: string;
  ownerId: string;
  assignmentId: string;
  confidenceBefore: number;
  confidenceAfter: number | null;
  localAttemptId: string | null;
  startedRemotely: boolean;
  completedRemotely: boolean;
};

const prefix = 'csm-offline-v1';
const storageKey = (ownerId: string, id: string) => `${prefix}:${ownerId}:assessment:${id}`;

export async function startAssessmentResilient(ownerId: string, assignmentId: string, confidence: number) {
  const assessment: OfflineAssessment = {
    id: createUuid(), ownerId, assignmentId, confidenceBefore: confidence,
    confidenceAfter: null, localAttemptId: null, startedRemotely: false, completedRemotely: false,
  };
  await write(assessment);
  try {
    await startMissionAssessment(assignmentId, confidence, assessment.id);
    await write({ ...assessment, startedRemotely: true });
  } catch { /* permanece na fila local */ }
  return assessment.id;
}

export async function completeAssessmentResilient(ownerId: string, assessmentId: string, localAttemptId: string, confidence: number) {
  const assessment = await read(ownerId, assessmentId);
  if (!assessment) throw new Error('ASSESSMENT_NOT_FOUND');
  const pending = { ...assessment, confidenceAfter: confidence, localAttemptId };
  await write(pending);
  const synced = await synchronizeAssessment(pending);
  return synced?.completedRemotely ? confidence - assessment.confidenceBefore : null;
}

export async function synchronizeAssessments(ownerId: string) {
  const keys = (await AsyncStorage.getAllKeys()).filter((item) => item.startsWith(`${prefix}:${ownerId}:assessment:`));
  const pairs = await AsyncStorage.multiGet(keys);
  for (const [, value] of pairs) {
    if (!value) continue;
    try { await synchronizeAssessment(JSON.parse(value) as OfflineAssessment); } catch { /* tenta novamente na reconexão */ }
  }
}

async function synchronizeAssessment(input: OfflineAssessment) {
  let assessment = input;
  if (!assessment.startedRemotely) {
    await startMissionAssessment(assessment.assignmentId, assessment.confidenceBefore, assessment.id);
    assessment = { ...assessment, startedRemotely: true };
    await write(assessment);
  }
  if (assessment.confidenceAfter === null || !assessment.localAttemptId || assessment.completedRemotely) return assessment;
  const attempt = await readOfflineAttempt(assessment.ownerId, assessment.assignmentId);
  const remoteAttemptId = attempt?.localAttemptId === assessment.localAttemptId ? attempt.remoteAttemptId : null;
  if (!remoteAttemptId) return assessment;
  await completeMissionAssessment(assessment.id, remoteAttemptId, assessment.confidenceAfter);
  assessment = { ...assessment, completedRemotely: true };
  await write(assessment);
  return assessment;
}

async function read(ownerId: string, id: string): Promise<OfflineAssessment | null> {
  try { const value = await AsyncStorage.getItem(storageKey(ownerId, id)); return value ? JSON.parse(value) : null; } catch { return null; }
}
async function write(value: OfflineAssessment) { await AsyncStorage.setItem(storageKey(value.ownerId, value.id), JSON.stringify(value)); }
function createUuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => { const random = Math.floor(Math.random() * 16); return (character === 'x' ? random : (random & 3) | 8).toString(16); }); }
