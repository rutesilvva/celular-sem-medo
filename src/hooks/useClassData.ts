import { useCallback, useEffect, useState } from 'react';

import type { Role } from '@/context/AppContext';
import {
  ClassContext,
  ClassParticipant,
  getMonitorClassParticipants,
  getMonitorParticipant,
  getMyClassContexts,
} from '@/lib/backend';

type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
};

export function useMyClass(role: Role): QueryState<ClassContext> {
  const loader = useCallback(async () => {
    const contexts = await getMyClassContexts();
    return contexts.find((context) => context.access_role === role) ?? null;
  }, [role]);
  return useQuery(loader);
}

export function useMonitorParticipants(classId: string | null): QueryState<ClassParticipant[]> {
  const loader = useCallback(
    () => classId ? getMonitorClassParticipants(classId) : Promise.resolve([]),
    [classId],
  );
  return useQuery(loader);
}

export function useMonitorParticipant(classId: string | null, participantId: string | null): QueryState<ClassParticipant> {
  const loader = useCallback(
    () => classId && participantId ? getMonitorParticipant(classId, participantId) : Promise.resolve(null),
    [classId, participantId],
  );
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
