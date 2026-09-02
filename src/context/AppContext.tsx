import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { initialManagedUsers, ManagedUser } from '@/data/admin';
import { useOptionalAuth } from '@/context/AuthContext';
import { saveParticipantPreferences } from '@/lib/backend';
import { readPreferencesCache, writePreferencesCache } from '@/lib/preferences-cache';

export type Role = 'participant' | 'admin';

export type AccessibilityPreferences = {
  largerText: boolean;
  highContrast: boolean;
  autoAudio: boolean;
  voiceResponse: boolean;
};

type AppContextValue = {
  preferences: AccessibilityPreferences;
  preferencesReady: boolean;
  preferencesSyncStatus: 'idle' | 'loading' | 'saving' | 'error';
  setPreference: (key: keyof AccessibilityPreferences, value: boolean) => void;
  retryPreferencesSync: () => void;
  audioMessage: string | null;
  notice: string | null;
  playInstruction: (message?: string) => void;
  showNotice: (message: string) => void;
  managedUsers: ManagedUser[];
  removeManagedUser: (userId: string) => boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

export const defaultPreferences: AccessibilityPreferences = {
  largerText: true,
  highContrast: false,
  autoAudio: true,
  voiceResponse: false,
};

export function AppProvider({ children }: PropsWithChildren) {
  const auth = useOptionalAuth();
  const userId = auth?.status === 'authenticated' ? auth.currentUser?.id ?? null : null;
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [preferencesOwnerId, setPreferencesOwnerId] = useState<string | null>(null);
  const [preferencesSyncStatus, setPreferencesSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('idle');
  const [audioMessage, setAudioMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [managedUsers, setManagedUsers] = useState(initialManagedUsers);
  const audioTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preferenceMutation = useRef(0);

  useEffect(() => {
    let active = true;
    if (!userId) {
      if (!preferencesOwnerId) return () => { active = false; };
      queueMicrotask(() => {
        if (!active) return;
        setPreferences(defaultPreferences);
        setPreferencesOwnerId(null);
        setPreferencesSyncStatus('idle');
      });
      return () => { active = false; };
    }
    queueMicrotask(() => { if (active) setPreferencesSyncStatus('loading'); });
    void readPreferencesCache(userId).then(async (cached) => {
      if (!active) return;
      const resolved = auth?.authenticatedPreferences ?? cached ?? defaultPreferences;
      setPreferences(resolved);
      setPreferencesOwnerId(userId);
      setPreferencesSyncStatus('idle');
      if (auth?.authenticatedPreferences) await writePreferencesCache(userId, resolved);
    });
    return () => { active = false; };
  }, [auth?.authenticatedPreferences, preferencesOwnerId, userId]);

  useEffect(() => () => {
    if (audioTimer.current) clearTimeout(audioTimer.current);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  const persistPreferences = useCallback((next: AccessibilityPreferences) => {
    if (!userId) return;
    const mutation = ++preferenceMutation.current;
    setPreferencesSyncStatus('saving');
    void writePreferencesCache(userId, next);
    void saveParticipantPreferences(userId, next)
      .then(() => {
        if (preferenceMutation.current === mutation) setPreferencesSyncStatus('idle');
      })
      .catch(() => {
        if (preferenceMutation.current === mutation) setPreferencesSyncStatus('error');
      });
  }, [userId]);

  const setPreference = useCallback((key: keyof AccessibilityPreferences, value: boolean) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      persistPreferences(next);
      return next;
    });
  }, [persistPreferences]);

  const retryPreferencesSync = useCallback(() => persistPreferences(preferences), [persistPreferences, preferences]);

  const playInstruction = useCallback((message = 'Reproduzindo instrução…') => {
    if (audioTimer.current) clearTimeout(audioTimer.current);
    setAudioMessage(message);
    const transcriptDuration = Math.min(12000, Math.max(4500, message.length * 55));
    audioTimer.current = setTimeout(() => setAudioMessage(null), transcriptDuration);
  }, []);

  const showNotice = useCallback((message: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(null), 2400);
  }, []);

  const removeManagedUser = useCallback((userId: string) => {
    const target = managedUsers.find((user) => user.id === userId);
    if (!target || target.currentUser) return false;
    if (target.role === 'admin' && managedUsers.filter((user) => user.role === 'admin').length <= 1) return false;
    setManagedUsers((current) => current.filter((user) => user.id !== userId));
    return true;
  }, [managedUsers]);

  const value = useMemo(() => ({
    preferences,
    preferencesReady: !userId || preferencesOwnerId === userId,
    preferencesSyncStatus,
    setPreference,
    retryPreferencesSync,
    audioMessage, notice, playInstruction, showNotice, managedUsers, removeManagedUser,
  }), [
    audioMessage, managedUsers, notice, playInstruction, preferences, preferencesOwnerId,
    preferencesSyncStatus, retryPreferencesSync, userId,
    removeManagedUser, setPreference, showNotice,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
