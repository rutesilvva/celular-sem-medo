import * as SecureStore from 'expo-secure-store';
import { clearPendingInvitation, readPendingInvitation, savePendingInvitation } from './pending-invitation';

jest.mock('expo-secure-store',()=>({WHEN_UNLOCKED_THIS_DEVICE_ONLY:'device-only',setItemAsync:jest.fn(),getItemAsync:jest.fn(),deleteItemAsync:jest.fn()}));

describe('pending invitation',()=>{
  beforeEach(()=>jest.clearAllMocks());
  it('rejects malformed tokens before storage',async()=>{await expect(savePendingInvitation('not-a-token')).rejects.toThrow('INVALID_INVITATION_TOKEN');expect(SecureStore.setItemAsync).not.toHaveBeenCalled();});
  it('stores, reads and clears a valid token in secure storage',async()=>{const token='a'.repeat(64);jest.mocked(SecureStore.getItemAsync).mockResolvedValue(token);await savePendingInvitation(token);expect(SecureStore.setItemAsync).toHaveBeenCalledWith('csm-pending-invitation-v1',token,{keychainAccessible:'device-only'});await expect(readPendingInvitation()).resolves.toBe(token);await clearPendingInvitation();expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('csm-pending-invitation-v1');});
});
