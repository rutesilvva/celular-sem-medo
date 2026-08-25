import { useCallback, useEffect, useState } from 'react';

import { getMonitorHelpRequests, getMyHelpRequests, type MonitorHelpRequest, type ParticipantHelpRequest } from '@/lib/backend';

export function useMyHelpRequests() {
  return useHelpQuery<ParticipantHelpRequest[]>(useCallback(() => getMyHelpRequests(), []), []);
}

export function useMonitorHelpRequests(classId: string | null) {
  return useHelpQuery<MonitorHelpRequest[]>(useCallback(
    () => classId ? getMonitorHelpRequests(classId) : Promise.resolve([]),
    [classId],
  ), []);
}

function useHelpQuery<T>(loader: () => Promise<T>, empty: T) {
  const [data, setData] = useState<T>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true); setError(false);
      void loader().then((value) => { if (active) setData(value); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    });
    return () => { active = false; };
  }, [generation, loader]);
  const retry = useCallback(() => setGeneration((value) => value + 1), []);
  return { data, loading, error, retry };
}
