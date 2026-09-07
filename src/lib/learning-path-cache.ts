import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getDailyMission,
  getLearningDiagnostic,
  getMissionReviewPlan,
  saveLearningDiagnostic,
  type DailyMission,
  type LearningDiagnostic,
  type LearningDiagnosticInput,
  type MissionReview,
} from '@/lib/backend';

type DiagnosticCache = { input: LearningDiagnosticInput; server: LearningDiagnostic | null; pending: boolean };
type PathCache = { daily: DailyMission | null; reviews: MissionReview[] };

const diagnosticKey = (userId: string) => `csm-learning-diagnostic-v1:${userId}`;
const pathKey = (userId: string) => `csm-learning-path-v1:${userId}`;

export async function saveDiagnosticResilient(userId: string, input: LearningDiagnosticInput) {
  await writeJson(diagnosticKey(userId), { input, server: null, pending: true } satisfies DiagnosticCache);
  try {
    await saveLearningDiagnostic(input);
    const server = await getLearningDiagnostic();
    await writeJson(diagnosticKey(userId), { input, server, pending: false } satisfies DiagnosticCache);
    return true;
  } catch {
    return false;
  }
}

export async function loadDiagnosticResilient(userId: string) {
  const cached = await readJson<DiagnosticCache>(diagnosticKey(userId));
  try {
    if (cached?.pending) await saveLearningDiagnostic(cached.input);
    const server = await getLearningDiagnostic();
    if (server) {
      const input = toInput(server);
      await writeJson(diagnosticKey(userId), { input, server, pending: false } satisfies DiagnosticCache);
      return { value: server, draft: input, offline: false, pending: false };
    }
    return { value: null, draft: cached?.input ?? null, offline: false, pending: cached?.pending ?? false };
  } catch {
    return { value: cached?.server ?? null, draft: cached?.input ?? null, offline: true, pending: cached?.pending ?? false };
  }
}

export async function loadPathResilient(userId: string) {
  const cached = await readJson<PathCache>(pathKey(userId));
  try {
    const [daily, reviews] = await Promise.all([getDailyMission(), getMissionReviewPlan()]);
    await writeJson(pathKey(userId), { daily, reviews } satisfies PathCache);
    return { daily, reviews, offline: false };
  } catch {
    if (cached) return { ...cached, offline: true };
    throw new Error('LEARNING_PATH_UNAVAILABLE');
  }
}

function toInput(value: LearningDiagnostic): LearningDiagnosticInput {
  return {
    experienceLevel: value.experience_level as LearningDiagnosticInput['experienceLevel'],
    preferredFormat: value.preferred_format as LearningDiagnosticInput['preferredFormat'],
    goals: value.goals,
    categoryConfidence: value.category_confidence as Record<string, number>,
    barriers: value.barriers as LearningDiagnosticInput['barriers'],
    scamResponse: value.scam_response as LearningDiagnosticInput['scamResponse'],
  };
}

async function readJson<T>(key: string): Promise<T | null> {
  try { const value = await AsyncStorage.getItem(key); return value ? JSON.parse(value) as T : null; } catch { return null; }
}

async function writeJson(key: string, value: unknown) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch { /* O servidor continua sendo a fonte de verdade. */ }
}
