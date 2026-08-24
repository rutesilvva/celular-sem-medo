import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { initialManagedUsers, ManagedUser } from '@/data/admin';

export type Role = 'participant' | 'monitor' | 'admin';

export type AccessibilityPreferences = {
  largerText: boolean;
  highContrast: boolean;
  autoAudio: boolean;
  voiceResponse: boolean;
};

type AppContextValue = {
  preferences: AccessibilityPreferences;
  setPreference: (key: keyof AccessibilityPreferences, value: boolean) => void;
  audioMessage: string | null;
  notice: string | null;
  playInstruction: (message?: string) => void;
  showNotice: (message: string) => void;
  managedUsers: ManagedUser[];
  removeManagedUser: (userId: string) => boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

const initialPreferences: AccessibilityPreferences = {
  largerText: true,
  highContrast: false,
  autoAudio: true,
  voiceResponse: false,
};

export function AppProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [audioMessage, setAudioMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [managedUsers, setManagedUsers] = useState(initialManagedUsers);
  const audioTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (audioTimer.current) clearTimeout(audioTimer.current);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  const setPreference = useCallback((key: keyof AccessibilityPreferences, value: boolean) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  }, []);

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
    preferences, setPreference,
    audioMessage, notice, playInstruction, showNotice, managedUsers, removeManagedUser,
  }), [
    audioMessage, managedUsers, notice, playInstruction, preferences,
    removeManagedUser, setPreference, showNotice,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
