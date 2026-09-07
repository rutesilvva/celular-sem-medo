import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearDiagnosticDraft, readDiagnosticDraft, writeDiagnosticDraft } from './diagnostic-draft';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('diagnostic draft', () => {
  beforeEach(async () => AsyncStorage.clear());

  it('keeps partial answers per user and restores the current step', async () => {
    await writeDiagnosticDraft('student-a', { step: 3, experienceLevel: 'beginner', independentActions: ['photos'] });
    expect(await readDiagnosticDraft('student-a')).toEqual({ step: 3, experienceLevel: 'beginner', independentActions: ['photos'] });
    expect(await readDiagnosticDraft('student-b')).toBeNull();
  });

  it('clears a completed draft and ignores malformed data', async () => {
    await writeDiagnosticDraft('student-a', { step: 1 });
    await clearDiagnosticDraft('student-a');
    expect(await readDiagnosticDraft('student-a')).toBeNull();
    await AsyncStorage.setItem('learning-path:v1:student-a:diagnostic-form', '{broken');
    expect(await readDiagnosticDraft('student-a')).toBeNull();
  });
});
