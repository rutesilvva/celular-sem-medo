import { useCallback, useEffect, useState } from 'react';

import {
  getMonitorClassProgress,
  getMonitorMissionProgress,
  getParticipantCategoryProgress,
  getParticipantProgress,
  type MonitorClassProgress,
  type MonitorMissionProgress,
  type ParticipantCategoryProgress,
  type ParticipantProgress,
} from '@/lib/backend';

export function useParticipantProgress() {
  return useProgressQuery<ParticipantProgress | null>(getParticipantProgress, null);
}

export function useParticipantCategoryProgress() {
  return useProgressQuery<ParticipantCategoryProgress[]>(getParticipantCategoryProgress, []);
}

export function useMonitorProgress(classId: string | null, periodDays: number) {
  const summaryLoader = useCallback(() => classId ? getMonitorClassProgress(classId, periodDays) : Promise.resolve(null), [classId, periodDays]);
  const missionsLoader = useCallback(() => classId ? getMonitorMissionProgress(classId, periodDays) : Promise.resolve([]), [classId, periodDays]);
  return {
    summary: useProgressQuery<MonitorClassProgress | null>(summaryLoader, null),
    missions: useProgressQuery<MonitorMissionProgress[]>(missionsLoader, []),
  };
}

function useProgressQuery<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      setLoading(true); setError(false);
      void loader().then((value) => { if (active) setData(value); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    });
    return () => { active = false; };
  }, [generation, loader]);
  return { data, loading, error, retry: useCallback(() => setGeneration((value) => value + 1), []) };
}
