import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LearningDiagnosticInput } from './backend';

export type DiagnosticDraft = Partial<LearningDiagnosticInput> & { step: number };

const key = (ownerId: string) => `learning-path:v1:${ownerId}:diagnostic-form`;

export async function readDiagnosticDraft(ownerId: string): Promise<DiagnosticDraft | null> {
  try {
    const value = await AsyncStorage.getItem(key(ownerId));
    if (!value) return null;
    const parsed = JSON.parse(value) as DiagnosticDraft;
    return Number.isInteger(parsed.step) && parsed.step >= 0 && parsed.step <= 7 ? parsed : null;
  } catch { return null; }
}

export async function writeDiagnosticDraft(ownerId: string, draft: DiagnosticDraft) {
  try { await AsyncStorage.setItem(key(ownerId), JSON.stringify(draft)); } catch { /* O preenchimento continua disponível na memória. */ }
}

export async function clearDiagnosticDraft(ownerId: string) {
  try { await AsyncStorage.removeItem(key(ownerId)); } catch { /* O servidor continuará sendo a fonte de verdade. */ }
}
