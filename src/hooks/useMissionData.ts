import { useCallback, useEffect, useState } from 'react';

import {
  getParticipantMissionCatalog,
  getParticipantMissionContent,
  ParticipantMission,
  ParticipantMissionDetails,
  ParticipantMissionStep,
} from '@/lib/backend';
import { useAuth } from '@/context/AuthContext';
import { cacheMissionCatalog, cacheMissionContent, readMissionCatalog, readMissionContent } from '@/lib/offline-store';

type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
  offline: boolean;
};

export function useMissionCatalog(): QueryState<ParticipantMission[]> {
  const { currentUser } = useAuth();
  const loader = useCallback(async () => {
    if (!currentUser) return null;
    try { const catalog=await getParticipantMissionCatalog(); await cacheMissionCatalog(currentUser.id,catalog); return { value:catalog,offline:false }; }
    catch { const cached=await readMissionCatalog(currentUser.id); if(cached)return { value:cached,offline:true }; throw new Error('MISSION_CATALOG_UNAVAILABLE'); }
  }, [currentUser]);
  return useQuery(loader);
}

export function useMissionContent(assignmentId: string | null): QueryState<{
  details: ParticipantMissionDetails;
  steps: ParticipantMissionStep[];
}> {
  const { currentUser } = useAuth();
  const loader = useCallback(async () => {
    if (!assignmentId || !currentUser) return null;
    try { const content=await getParticipantMissionContent(assignmentId); if(!content.details)return null;const value={details:content.details,steps:content.steps};await cacheMissionContent(currentUser.id,assignmentId,value);return {value,offline:false}; }
    catch { const cached=await readMissionContent(currentUser.id,assignmentId);if(cached)return {value:cached,offline:true};throw new Error('MISSION_CONTENT_UNAVAILABLE'); }
  }, [assignmentId, currentUser]);
  return useQuery(loader);
}

function useQuery<T>(loader: () => Promise<{ value: T; offline: boolean } | null>): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(false);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError(false);
      void loader().then((result) => {
        if (active) { setData(result?.value ?? null); setOffline(result?.offline ?? false); }
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
  return { data, loading, error, retry, offline };
}
