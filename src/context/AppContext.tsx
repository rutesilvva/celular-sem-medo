import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { initialManagedUsers, ManagedUser } from '@/data/admin';
import { getCurrentRoles, signOutFromGoogle } from '@/lib/google-auth';
import { getSupabase } from '@/lib/supabase';

export type Role = 'participant' | 'monitor' | 'admin';

export type AccessibilityPreferences = {
  largerText: boolean;
  highContrast: boolean;
  autoAudio: boolean;
  voiceResponse: boolean;
};

type AppContextValue = {
  role: Role;
  setRole: (role: Role) => void;
  sessionRole: Role | null;
  signIn: (role: Role) => void;
  signOut: () => void;
  preferences: AccessibilityPreferences;
  setPreference: (key: keyof AccessibilityPreferences, value: boolean) => void;
  mission: MissionState;
  participantProgress: number;
  startMission: () => void;
  requestMissionHelp: () => void;
  finishMission: () => void;
  audioMessage: string | null;
  notice: string | null;
  playInstruction: (message?: string) => void;
  showNotice: (message: string) => void;
  managedUsers: ManagedUser[];
  removeManagedUser: (userId: string) => boolean;
};

export type MissionState = {
  completed: boolean;
  attempts: number;
  usedHelp: boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

const initialPreferences: AccessibilityPreferences = {
  largerText: true,
  highContrast: false,
  autoAudio: true,
  voiceResponse: false,
};

export function AppProvider({ children }: PropsWithChildren) {
  const [role, setRole] = useState<Role>('participant');
  const [sessionRole, setSessionRole] = useState<Role | null>(null);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [mission, setMission] = useState<MissionState>({ completed: false, attempts: 0, usedHelp: false });
  const [audioMessage, setAudioMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [managedUsers, setManagedUsers] = useState(initialManagedUsers);
  const audioTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (audioTimer.current) clearTimeout(audioTimer.current);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  useEffect(() => {
    try {
      const supabase = getSupabase();
      void supabase.auth.getSession().then(async ({ data }) => {
        if (!data.session) return;
        const roles = await getCurrentRoles();
        if (roles.length === 1) {
          setRole(roles[0]!);
          setSessionRole(roles[0]!);
        }
      }).catch(() => undefined);
    } catch {
      // A tela de login apresenta erro tratável quando o ambiente não está configurado.
    }
  }, []);

  const setPreference = useCallback((key: keyof AccessibilityPreferences, value: boolean) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  }, []);

  const signIn = useCallback((nextRole: Role) => {
    setRole(nextRole);
    setSessionRole(nextRole);
  }, []);

  const signOut = useCallback(() => {
    void signOutFromGoogle().catch(() => undefined);
    setSessionRole(null);
    setAudioMessage(null);
  }, []);

  const startMission = useCallback(() => {
    setMission((current) => ({
      ...current,
      attempts: 1,
      usedHelp: false,
    }));
  }, []);

  const requestMissionHelp = useCallback(() => {
    setMission((current) => ({
      ...current,
      attempts: Math.max(2, current.attempts),
      usedHelp: true,
    }));
  }, []);

  const finishMission = useCallback(() => {
    setMission((current) => ({
      ...current,
      attempts: Math.max(1, current.attempts),
      completed: true,
    }));
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
    role,
    setRole,
    sessionRole,
    signIn,
    signOut,
    preferences,
    setPreference,
    mission,
    participantProgress: mission.completed ? 80 : 72,
    startMission,
    requestMissionHelp,
    finishMission,
    audioMessage,
    notice,
    playInstruction,
    showNotice,
    managedUsers,
    removeManagedUser,
  }), [
    audioMessage,
    finishMission,
    mission,
    managedUsers,
    notice,
    playInstruction,
    preferences,
    requestMissionHelp,
    removeManagedUser,
    role,
    sessionRole,
    setPreference,
    showNotice,
    signIn,
    signOut,
    startMission,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
