import { useCallback, useEffect, useState } from 'react';

import { getAdminHelpRequests, getHelpRequestHistory, getMyHelpRequests, type AdminHelpRequest, type HelpRequestHistory, type ParticipantHelpRequest } from '@/lib/backend';
import { getSupabase } from '@/lib/supabase';

export function useMyHelpRequests() {
  const query = useHelpQuery<ParticipantHelpRequest[]>(useCallback(() => getMyHelpRequests(), []), []);
  useEffect(() => {
    const channel = getSupabase().channel('my-help-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_requests' }, query.retry)
      .subscribe();
    return () => { void getSupabase().removeChannel(channel); };
  }, [query.retry]);
  return query;
}

export function useAdminHelpRequests(classId: string | null) {
  const query = useHelpQuery<AdminHelpRequest[]>(useCallback(
    () => classId ? getAdminHelpRequests(classId) : Promise.resolve([]),
    [classId],
  ), []);
  useEffect(() => {
    if (!classId) return;
    const channel = getSupabase().channel(`admin-help-${classId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_requests', filter: `class_id=eq.${classId}` }, query.retry)
      .subscribe();
    return () => { void getSupabase().removeChannel(channel); };
  }, [classId, query.retry]);
  return query;
}

export function useHelpRequestHistory(requestId: string | null) {
  return useHelpQuery<HelpRequestHistory[]>(useCallback(
    () => requestId ? getHelpRequestHistory(requestId) : Promise.resolve([]), [requestId],
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
