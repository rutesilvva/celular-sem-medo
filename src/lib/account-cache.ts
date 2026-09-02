import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthenticatedAccount } from '@/lib/google-auth';
const key='csm-offline-account-v1';
export async function writeAccountCache(account:AuthenticatedAccount){try{const value=JSON.stringify(account);if(Platform.OS==='web')globalThis.sessionStorage?.setItem(key,value);else await SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY})}catch{}}
export async function readAccountCache():Promise<AuthenticatedAccount|null>{try{const value=Platform.OS==='web'?globalThis.sessionStorage?.getItem(key):await SecureStore.getItemAsync(key);if(!value)return null;const account=JSON.parse(value) as AuthenticatedAccount;return account.user?.id&&account.roles?.length?account:null}catch{return null}}
export async function clearAccountCache(){try{if(Platform.OS==='web')globalThis.sessionStorage?.removeItem(key);else await SecureStore.deleteItemAsync(key)}catch{}}
