import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';

import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { cleanupOfflineAttempts, listOfflineAttempts, syncBackoffMs } from '@/lib/offline-store';
import { synchronizeOfflineAttempt } from '@/lib/offline-sync';
import { synchronizeAssessments } from '@/lib/offline-assessments';
import { publishSyncState } from '@/lib/sync-status';

export function OfflineSyncManager() {
  const { currentUser } = useAuth();
  const { showNotice } = useApp();
  useEffect(() => {
    if (!currentUser) return;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let active = true;
    const sync = async () => {
      if (!active) return;
      const network = await NetInfo.fetch();
      if (!network.isConnected || network.isInternetReachable === false) { publishSyncState('offline'); return; }
      publishSyncState('syncing');
      let sent = 0;
      try {
        await cleanupOfflineAttempts(currentUser.id);
        for (const attempt of await listOfflineAttempts(currentUser.id)) {
          if (attempt.ownerId !== currentUser.id || !attempt.pending.length) continue;
          const before = attempt.pending.length;
          const result = await synchronizeOfflineAttempt(currentUser.id, attempt.assignmentId);
          sent += Math.max(0, before - (result?.pending.length ?? before));
        }
        await synchronizeAssessments(currentUser.id);
        retryCount = 0;
        if (sent) showNotice(`${sent} atividade(s) offline sincronizada(s).`);
        publishSyncState('saved');
      } catch {
        publishSyncState('error');
        retryCount += 1;
        retryTimer = setTimeout(() => void sync(), syncBackoffMs(retryCount));
      } finally { /* o lock por tentativa é liberado pelo coordenador */ }
    };
    void sync();
    const unsubscribe = NetInfo.addEventListener((state) => { if (state.isConnected && state.isInternetReachable !== false) void sync(); });
    return () => { active = false; unsubscribe(); if (retryTimer) clearTimeout(retryTimer); };
  }, [currentUser, showNotice]);
  return null;
}
