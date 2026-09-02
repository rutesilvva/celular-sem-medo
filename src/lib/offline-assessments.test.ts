import AsyncStorage from '@react-native-async-storage/async-storage';

import { completeMissionAssessment, startMissionAssessment } from './backend';
import { completeAssessmentResilient, startAssessmentResilient, synchronizeAssessments } from './offline-assessments';
import { writeOfflineAttempt } from './offline-store';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('./backend', () => ({ startMissionAssessment: jest.fn(), completeMissionAssessment: jest.fn() }));

const startMock = jest.mocked(startMissionAssessment);
const completeMock = jest.mocked(completeMissionAssessment);

describe('offline assessments', () => {
  beforeEach(async () => { await AsyncStorage.clear(); jest.clearAllMocks(); });

  it('keeps the assessment and completes it after the attempt receives a remote id', async () => {
    startMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValue('assessment-id');
    completeMock.mockResolvedValue(2);
    const assessmentId = await startAssessmentResilient('user-a', 'assignment-a', 2);
    expect(await completeAssessmentResilient('user-a', assessmentId, 'local-attempt', 4)).toBeNull();

    await writeOfflineAttempt({
      ownerId: 'user-a', assignmentId: 'assignment-a', localAttemptId: 'local-attempt', remoteAttemptId: 'remote-attempt',
      remoteNextSequence: 2, run: { stepIndex: 1, mistakes: 0, usedHint: false, usedHelp: false, completed: true },
      pending: [], syncedOperationIds: [], updatedAt: new Date().toISOString(),
    });
    await synchronizeAssessments('user-a');

    expect(startMock).toHaveBeenLastCalledWith('assignment-a', 2, assessmentId);
    expect(completeMock).toHaveBeenCalledWith(assessmentId, 'remote-attempt', 4);
  });
});
