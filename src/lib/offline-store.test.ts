import AsyncStorage from '@react-native-async-storage/async-storage';

import { cleanupOfflineAttempts, enqueueOfflineEvent, listOfflineAttempts, markOfflineEventSynced, readOfflineAttempt, syncBackoffMs, writeOfflineAttempt, type OfflineAttempt } from './offline-store';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const base: OfflineAttempt={ownerId:'user-a',assignmentId:'assignment',localAttemptId:'attempt',remoteAttemptId:null,remoteNextSequence:null,run:{stepIndex:0,mistakes:0,usedHint:false,usedHelp:false,completed:false},pending:[],syncedOperationIds:[],updatedAt:'2026-01-01'};
describe('offline queue',()=>{beforeEach(async()=>AsyncStorage.clear());it('is idempotent per operation',()=>{const event={operationId:'op-1',eventType:'action_succeeded' as const,occurredAt:'2026-01-01'};expect(enqueueOfflineEvent(enqueueOfflineEvent(base,event),event).pending).toHaveLength(1)});it('never returns another owner queue',async()=>{await writeOfflineAttempt(base);expect(await readOfflineAttempt('user-b','assignment')).toBeNull();expect(await readOfflineAttempt('user-a','assignment')).toEqual(base)});it('advances cursor only after confirmation',()=>{const queued=enqueueOfflineEvent(base,{operationId:'op-1',eventType:'action_succeeded',occurredAt:'2026'});const synced=markOfflineEventSynced(queued,'op-1','remote',4);expect(synced).toMatchObject({remoteAttemptId:'remote',remoteNextSequence:4,pending:[]});expect(synced.syncedOperationIds).toContain('op-1')});it('uses capped exponential backoff',()=>{expect([1,2,3,9].map(syncBackoffMs)).toEqual([1000,2000,4000,30000])})});

describe('offline queue recovery', () => {
  beforeEach(async () => AsyncStorage.clear());
  it('removes a corrupted record instead of blocking the queue', async () => {
    await AsyncStorage.setItem('csm-offline-v1:user-a:attempt:broken', '{invalid');
    expect(await listOfflineAttempts('user-a')).toEqual([]);
    expect(await AsyncStorage.getItem('csm-offline-v1:user-a:attempt:broken')).toBeNull();
  });
  it('expires only old synchronized attempts and retains pending work', async () => {
    const old = { ...base, updatedAt: '2025-01-01T00:00:00.000Z' };
    const pending = enqueueOfflineEvent({ ...base, assignmentId: 'pending', updatedAt: old.updatedAt }, { operationId: 'keep', eventType: 'attempt_started', occurredAt: old.updatedAt });
    await writeOfflineAttempt(old); await writeOfflineAttempt(pending);
    expect(await cleanupOfflineAttempts('user-a', Date.parse('2026-09-02T00:00:00.000Z'), 90 * 86400000)).toEqual({ removed: 1, retained: 1 });
    expect(await readOfflineAttempt('user-a', 'pending')).not.toBeNull();
  });
});
