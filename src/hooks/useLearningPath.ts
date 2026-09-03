import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { loadDiagnosticResilient, loadPathResilient } from '@/lib/learning-path-cache';
import type { DailyMission, LearningDiagnostic, LearningDiagnosticInput, MissionReview } from '@/lib/backend';

export function useLearningPath() {
  const { currentUser } = useAuth();
  const [diagnostic, setDiagnostic] = useState<LearningDiagnostic | null>(null);
  const [draft, setDraft] = useState<LearningDiagnosticInput | null>(null);
  const [daily, setDaily] = useState<DailyMission | null>(null);
  const [reviews, setReviews] = useState<MissionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(false);
  const [generation, setGeneration] = useState(0);
  const retry = useCallback(() => setGeneration((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (!currentUser) { setLoading(false); return; }
      setLoading(true); setError(false);
      void Promise.all([loadDiagnosticResilient(currentUser.id), loadPathResilient(currentUser.id)])
      .then(([diagnosticResult, pathResult]) => {
        if (!active) return;
        setDiagnostic(diagnosticResult.value); setDraft(diagnosticResult.draft);
        setDaily(pathResult.daily); setReviews(pathResult.reviews);
        setOffline(diagnosticResult.offline || pathResult.offline);
      }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    });
    return () => { active = false; };
  }, [currentUser, generation]);

  return { diagnostic, draft, daily, reviews, loading, error, offline, retry };
}
