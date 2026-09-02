import { useCallback, useEffect, useState } from 'react';

import type { Role } from '@/context/AppContext';
import {
  ClassContext,
  ClassParticipant,
  getAdminClassContexts,
  getMonitorParticipant,
  getMonitorParticipantHistory,
  getMonitorParticipantsPage,
  getMyClassContexts,
  type MonitorParticipantFilter,
  type MonitorParticipantHistory,
  type MonitorParticipantsPage,
  type MonitorParticipantSort,
} from '@/lib/backend';

type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: boolean;
  updatedAt: Date | null;
  retry: () => void;
};

export function useMyClass(role: Role): QueryState<ClassContext> {
  const loader = useCallback(async () => {
    const contexts = await getMyClassContexts();
    return contexts.find((context) => context.access_role === role) ?? null;
  }, [role]);
  return useQuery(loader);
}

/** Administradores são globais; a primeira turma ativa inicia o acompanhamento. */
export function useAdminClass(): QueryState<ClassContext> {
  const loader = useCallback(async () => {
    const contexts = await getAdminClassContexts();
    return contexts[0] ?? null;
  }, []);
  return useQuery(loader);
}

export function useMonitorParticipants(classId: string | null, options: {
  periodDays?: 7 | 30 | 90;
  search?: string;
  filter?: MonitorParticipantFilter;
  sort?: MonitorParticipantSort;
  limit?: number;
  offset?: number;
} = {}): QueryState<MonitorParticipantsPage> {
  const { periodDays = 30, search = '', filter = 'all', sort = 'name', limit = 20, offset = 0 } = options;
  const loader = useCallback(
    () => classId
      ? getMonitorParticipantsPage({ classId, periodDays, search, filter, sort, limit, offset })
      : Promise.resolve({ items: [], total: 0, limit, offset }),
    [classId, filter, limit, offset, periodDays, search, sort],
  );
  return useQuery(loader);
}

export function useMonitorParticipant(classId: string | null, participantId: string | null, periodDays: 7 | 30 | 90 = 30): QueryState<ClassParticipant> {
  const loader = useCallback(
    () => classId && participantId ? getMonitorParticipant(classId, participantId, periodDays) : Promise.resolve(null),
    [classId, participantId, periodDays],
  );
  return useQuery(loader);
}

export function useMonitorParticipantHistory(classId: string | null, participantId: string | null, periodDays: 7 | 30 | 90 = 30): QueryState<MonitorParticipantHistory[]> {
  const loader = useCallback(
    () => classId && participantId ? getMonitorParticipantHistory(classId, participantId, periodDays) : Promise.resolve([]),
    [classId, participantId, periodDays],
  );
  return useQuery(loader);
}

function useQuery<T>(loader: () => Promise<T | null>): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError(false);
      void loader().then((result) => {
        if (active) { setData(result); setUpdatedAt(new Date()); }
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
  return { data, loading, error, updatedAt, retry };
}
