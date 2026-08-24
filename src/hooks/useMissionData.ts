import { useCallback, useEffect, useState } from 'react';

import {
  getParticipantMissionCatalog,
  getParticipantMissionContent,
  ParticipantMission,
  ParticipantMissionDetails,
  ParticipantMissionStep,
} from '@/lib/backend';

type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
};

export function useMissionCatalog(): QueryState<ParticipantMission[]> {
  const loader = useCallback(() => getParticipantMissionCatalog(), []);
  return useQuery(loader);
}

export function useMissionContent(assignmentId: string | null): QueryState<{
  details: ParticipantMissionDetails;
  steps: ParticipantMissionStep[];
}> {
  const loader = useCallback(async () => {
    if (!assignmentId) return null;
    const content = await getParticipantMissionContent(assignmentId);
    return content.details ? { details: content.details, steps: content.steps } : null;
  }, [assignmentId]);
  return useQuery(loader);
}

function useQuery<T>(loader: () => Promise<T | null>): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError(false);
      void loader().then((result) => {
        if (active) setData(result);
      }).catch(() => {
        if (active) {
          setData(null);
          setError(true);
        }
      }).finally(() => {
        if (active) setLoading(false);
      });
    });
    return () => {
      active = false;
    };
  }, [generation, loader]);

  const retry = useCallback(() => setGeneration((current) => current + 1), []);
  return { data, loading, error, retry };
}
