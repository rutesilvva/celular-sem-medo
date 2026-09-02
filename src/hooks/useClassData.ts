import { useCallback, useEffect, useState } from 'react';

import type { Role } from '@/context/AppContext';
import {
  ClassContext,
  ClassParticipant,
  getAdminClassContexts,
  getAdminParticipant,
  getAdminParticipantHistory,
  getAdminParticipantsPage,
  getMyClassContexts,
  type AdminParticipantFilter,
  type AdminParticipantHistory,
  type AdminParticipantsPage,
  type AdminParticipantSort,
} from '@/lib/backend';

type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: boolean;
  updatedAt: Date | null;
  retry: () => void;
};

export function pickPrimaryClassContext<T extends Pick<ClassContext, 'class_id' | 'class_name' | 'joined_at' | 'access_role'>>(contexts: T[] | null | undefined): T | null {
  if (!contexts || contexts.length === 0) return null;

  return contexts.slice().sort((left, right) => {
    const leftTime = left.joined_at ? new Date(left.joined_at).getTime() : Number.NEGATIVE_INFINITY;
    const rightTime = right.joined_at ? new Date(right.joined_at).getTime() : Number.NEGATIVE_INFINITY;

    if (rightTime !== leftTime) return rightTime - leftTime;
    return left.class_name.localeCompare(right.class_name, 'pt-BR') || left.class_id.localeCompare(right.class_id);
  })[0] ?? null;
}

export function useMyClass(role: Role): QueryState<ClassContext> {
  const loader = useCallback(async () => {
    const contexts = await getMyClassContexts();
    const filtered = contexts.filter((context) => context.access_role === role);
    return pickPrimaryClassContext(filtered) ?? null;
  }, [role]);
  return useQuery(loader);
}

/** Administradores são globais; a turma principal é a mais recente ativa, nunca a primeira arbitrária. */
export function useAdminClass(): QueryState<ClassContext> {
  const loader = useCallback(async () => {
    const contexts = await getAdminClassContexts();
    return pickPrimaryClassContext(contexts) ?? null;
  }, []);
  return useQuery(loader);
}

export function useAdminParticipants(classId: string | null, options: {
  periodDays?: 7 | 30 | 90;
  search?: string;
  filter?: AdminParticipantFilter;
  sort?: AdminParticipantSort;
  limit?: number;
  offset?: number;
} = {}): QueryState<AdminParticipantsPage> {
  const { periodDays = 30, search = '', filter = 'all', sort = 'name', limit = 20, offset = 0 } = options;
  const loader = useCallback(
    () => classId
      ? getAdminParticipantsPage({ classId, periodDays, search, filter, sort, limit, offset })
      : Promise.resolve({ items: [], total: 0, limit, offset }),
    [classId, filter, limit, offset, periodDays, search, sort],
  );
  return useQuery(loader);
}

export function useAdminParticipant(classId: string | null, participantId: string | null, periodDays: 7 | 30 | 90 = 30): QueryState<ClassParticipant> {
  const loader = useCallback(
    () => classId && participantId ? getAdminParticipant(classId, participantId, periodDays) : Promise.resolve(null),
    [classId, participantId, periodDays],
  );
  return useQuery(loader);
}

export function useAdminParticipantHistory(classId: string | null, participantId: string | null, periodDays: 7 | 30 | 90 = 30): QueryState<AdminParticipantHistory[]> {
  const loader = useCallback(
    () => classId && participantId ? getAdminParticipantHistory(classId, participantId, periodDays) : Promise.resolve([]),
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
