import { useCallback, useEffect, useState } from 'react';

import { getAdminClasses, getAdminUsers, type AdminClass, type AdminUser } from '@/lib/backend';

function useAdminQuery<T>(loader: () => Promise<T>, empty: T) {
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true); setError(false);
      void loader().then((value) => { if (active) setData(value); })
        .catch(() => { if (active) setError(true); })
        .finally(() => { if (active) setLoading(false); });
    });
    return () => { active = false; };
  }, [generation, loader]);
  return { data, loading, error, retry: useCallback(() => setGeneration((value) => value + 1), []) };
}

export function useAdminClasses() {
  return useAdminQuery<AdminClass[]>(useCallback(() => getAdminClasses(), []), []);
}

export function useAdminUsers() {
  return useAdminQuery<AdminUser[]>(useCallback(() => getAdminUsers(), []), []);
}
