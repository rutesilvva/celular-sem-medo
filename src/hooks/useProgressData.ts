import { useCallback, useEffect, useState } from 'react';

import {
  getAdminClassProgress,
  getAdminClassEvolution,
  getAdminMissionProgress,
  getParticipantCategoryProgress,
  getParticipantProgress,
  getMyEvolutionTimeline,
  getMyRetentionChecks,
  type AdminClassProgress,
  type AdminClassEvolution,
  type AdminMissionProgress,
  type ParticipantCategoryProgress,
  type ParticipantProgress,
  type EvolutionTimelineItem,
  type RetentionCheck,
} from '@/lib/backend';

export function useParticipantProgress() {
  return useProgressQuery<ParticipantProgress | null>(getParticipantProgress, null);
}

export function useParticipantCategoryProgress() {
  return useProgressQuery<ParticipantCategoryProgress[]>(getParticipantCategoryProgress, []);
}

export function useEvolutionTimeline() {
  return useProgressQuery<EvolutionTimelineItem[]>(getMyEvolutionTimeline, []);
}

export function useRetentionChecks() {
  return useProgressQuery<RetentionCheck[]>(getMyRetentionChecks, []);
}

export function useAdminProgress(classId: string | null, periodDays: 7 | 30 | 90) {
  const summaryLoader = useCallback(() => classId ? getAdminClassProgress(classId, periodDays) : Promise.resolve(null), [classId, periodDays]);
  const missionsLoader = useCallback(() => classId ? getAdminMissionProgress(classId, periodDays) : Promise.resolve([]), [classId, periodDays]);
  const evolutionLoader = useCallback(() => classId ? getAdminClassEvolution(classId, periodDays) : Promise.resolve([]), [classId, periodDays]);
  return {
    summary: useProgressQuery<AdminClassProgress | null>(summaryLoader, null),
    missions: useProgressQuery<AdminMissionProgress[]>(missionsLoader, []),
    evolution: useProgressQuery<AdminClassEvolution[]>(evolutionLoader, []),
  };
}

function useProgressQuery<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      setLoading(true); setError(false);
      void loader().then((value) => { if (active) { setData(value); setUpdatedAt(new Date()); } }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    });
    return () => { active = false; };
  }, [generation, loader]);
  return { data, loading, error, updatedAt, retry: useCallback(() => setGeneration((value) => value + 1), []) };
}
