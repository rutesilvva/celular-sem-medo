import { useEffect } from 'react';

import { initializeObservabilityPreference } from '@/lib/observability-preferences';

export function ObservabilityManager() {
  useEffect(() => { void initializeObservabilityPreference(); }, []);
  return null;
}
