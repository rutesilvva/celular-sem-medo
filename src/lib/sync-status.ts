import { useEffect,useState } from 'react';
export type SyncState='idle'|'offline'|'syncing'|'saved'|'error';
let current:SyncState='idle';const listeners=new Set<(state:SyncState)=>void>();
export function publishSyncState(state:SyncState){current=state;listeners.forEach(listener=>listener(state));}
export function getSyncState(){return current;}
export function useSyncState(){const[state,setState]=useState(current);useEffect(()=>{listeners.add(setState);return()=>{listeners.delete(setState);};},[]);return state;}
