import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { appendAttemptEvent, setMissionAttemptProgress, startOrResumeMissionAttempt } from './backend';
import { readOfflineAttempt, writeOfflineAttempt } from './offline-store';
import { synchronizeOfflineAttempt } from './offline-sync';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () => ({ fetch: jest.fn() }));
jest.mock('./backend', () => ({ appendAttemptEvent: jest.fn(), setMissionAttemptProgress: jest.fn(), startOrResumeMissionAttempt: jest.fn() }));

const networkMock = jest.mocked(NetInfo.fetch);
const startMock = jest.mocked(startOrResumeMissionAttempt);
const appendMock = jest.mocked(appendAttemptEvent);
const progressMock = jest.mocked(setMissionAttemptProgress);

describe('offline synchronization coordinator', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    networkMock.mockResolvedValue({ isConnected: true, isInternetReachable: true } as never);
    startMock.mockResolvedValue({ attempt_id: '11111111-1111-4111-8111-111111111111', attempt_status: 'in_progress', current_step_id: 'step-a', mistake_count: 0, next_sequence_number: 1, used_help: false, used_hint: false });
    appendMock.mockResolvedValue({ inserted: true, stored_event_id: 'event-a' });
    progressMock.mockResolvedValue('in_progress');
  });

  it('uses one lock when screen and global manager synchronize together', async () => {
    await writeOfflineAttempt({
      ownerId: 'user-a', assignmentId: 'assignment-a', localAttemptId: 'local-a', remoteAttemptId: null,
      remoteNextSequence: null, run: { stepIndex: 1, mistakes: 0, usedHint: false, usedHelp: false, completed: false },
      pending: [{ operationId: 'op-a', eventType: 'action_succeeded', occurredAt: '2026-09-02T10:00:00Z' }],
      syncedOperationIds: [], updatedAt: '2026-09-02T10:00:00Z',
    });
    await Promise.all([
      synchronizeOfflineAttempt('user-a', 'assignment-a'),
      synchronizeOfflineAttempt('user-a', 'assignment-a'),
    ]);
    expect(startMock).toHaveBeenCalledTimes(1);
    expect(appendMock).toHaveBeenCalledTimes(1);
    expect((await readOfflineAttempt('user-a', 'assignment-a'))?.pending).toHaveLength(0);
  });

  it('does not send another account queue', async () => {
    await writeOfflineAttempt({
      ownerId: 'user-a', assignmentId: 'assignment-a', localAttemptId: 'local-a', remoteAttemptId: null,
      remoteNextSequence: null, run: { stepIndex: 0, mistakes: 0, usedHint: false, usedHelp: false, completed: false },
      pending: [{ operationId: 'op-a', eventType: 'attempt_started', occurredAt: '2026-09-02T10:00:00Z' }],
      syncedOperationIds: [], updatedAt: '2026-09-02T10:00:00Z',
    });
    await synchronizeOfflineAttempt('user-b', 'assignment-a');
    expect(startMock).not.toHaveBeenCalled();
  });
});
