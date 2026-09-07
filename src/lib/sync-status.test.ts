import { getSyncState,publishSyncState } from './sync-status';
describe('global sync status',()=>{it('publishes deterministic states',()=>{publishSyncState('syncing');expect(getSyncState()).toBe('syncing');publishSyncState('saved');expect(getSyncState()).toBe('saved');});});
