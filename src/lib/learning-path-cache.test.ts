import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDailyMission, getLearningDiagnostic, getMissionReviewPlan, saveLearningDiagnostic } from './backend';
import type { LearningDiagnosticInput } from './backend';
import { loadDiagnosticResilient, loadPathResilient, saveDiagnosticResilient } from './learning-path-cache';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('./backend', () => ({ getDailyMission: jest.fn(), getLearningDiagnostic: jest.fn(), getMissionReviewPlan: jest.fn(), saveLearningDiagnostic: jest.fn() }));

const input: LearningDiagnosticInput = { experienceLevel: 'beginner', preferredFormat: 'practice', goals: ['Segurança'], categoryConfidence: { Segurança: 2 } };
const diagnostic = { diagnostic_id: 'd1', experience_level: 'beginner', preferred_format: 'practice', goals: ['Segurança'], category_confidence: { Segurança: 2 }, updated_at: '2026-09-03T00:00:00Z' };

describe('learning path cache', () => {
  beforeEach(async () => { await AsyncStorage.clear(); jest.clearAllMocks(); });

  it('keeps an offline diagnostic and synchronizes it on the next load', async () => {
    jest.mocked(saveLearningDiagnostic).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('d1');
    jest.mocked(getLearningDiagnostic).mockResolvedValue(diagnostic);
    expect(await saveDiagnosticResilient('u1', input)).toBe(false);
    const result = await loadDiagnosticResilient('u1');
    expect(saveLearningDiagnostic).toHaveBeenLastCalledWith(input);
    expect(result).toMatchObject({ value: diagnostic, pending: false, offline: false });
  });

  it('returns the cached daily mission and review plan while offline', async () => {
    const daily = { assignment_id: 'a1', title: 'Golpes', category: 'Segurança', estimated_minutes: 5, daily_reason: 'Pratique hoje', is_review: false };
    jest.mocked(getDailyMission).mockResolvedValueOnce(daily).mockRejectedValueOnce(new Error('offline'));
    jest.mocked(getMissionReviewPlan).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('offline'));
    await loadPathResilient('u1');
    await expect(loadPathResilient('u1')).resolves.toEqual({ daily, reviews: [], offline: true });
  });
});
