import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { initialManagedUsers, ManagedUser } from '@/data/admin';
import { loadAuthenticatedAccount, signOutFromGoogle } from '@/lib/google-auth';
import type { AuthenticatedAccount, AuthenticatedUser } from '@/lib/google-auth';
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
  sessionRole: Role | null;
  availableRoles: Role[];
  currentUser: AuthenticatedUser | null;
  participantOnboardingCompleted: boolean;
  authReady: boolean;
  acceptAuthenticatedAccount: (account: AuthenticatedAccount) => void;
  selectSessionRole: (role: Role) => boolean;
  completeParticipantOnboarding: () => Promise<boolean>;
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
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [participantOnboardingCompleted, setParticipantOnboardingCompleted] = useState(false);
  const [authReady, setAuthReady] = useState(false);
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

  const acceptAuthenticatedAccount = useCallback((account: AuthenticatedAccount) => {
    setAvailableRoles(account.roles);
    setCurrentUser(account.user);
    setParticipantOnboardingCompleted(account.participantOnboardingCompleted);
    if (account.roles.length === 1) {
      setRole(account.roles[0]!);
      setSessionRole(account.roles[0]!);
    } else {
      setSessionRole(null);
    }
  }, []);

  useEffect(() => {
    try {
      const supabase = getSupabase();
      void supabase.auth.getSession().then(async ({ data }) => {
        if (data.session) acceptAuthenticatedAccount(await loadAuthenticatedAccount());
      }).catch(() => undefined).finally(() => setAuthReady(true));
    } catch {
      queueMicrotask(() => setAuthReady(true));
    }
  }, [acceptAuthenticatedAccount]);

  const selectSessionRole = useCallback((nextRole: Role) => {
    if (!availableRoles.includes(nextRole)) return false;
    setRole(nextRole);
    setSessionRole(nextRole);
    return true;
  }, [availableRoles]);

  const completeParticipantOnboarding = useCallback(async () => {
    if (!currentUser || !availableRoles.includes('participant')) return false;
    const { error } = await getSupabase().from('preferences').update({
      larger_text: preferences.largerText,
      high_contrast: preferences.highContrast,
      auto_audio: preferences.autoAudio,
      voice_response: preferences.voiceResponse,
      onboarding_completed_at: new Date().toISOString(),
    }).eq('user_id', currentUser.id);
    if (error) return false;
    setParticipantOnboardingCompleted(true);
    return true;
  }, [availableRoles, currentUser, preferences]);

  const setPreference = useCallback((key: keyof AccessibilityPreferences, value: boolean) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  }, []);

  const signOut = useCallback(() => {
    void signOutFromGoogle().catch(() => undefined);
    setSessionRole(null);
    setAvailableRoles([]);
    setCurrentUser(null);
    setAudioMessage(null);
  }, []);

  const startMission = useCallback(() => setMission((current) => ({ ...current, attempts: 1, usedHelp: false })), []);
  const requestMissionHelp = useCallback(() => setMission((current) => ({ ...current, attempts: Math.max(2, current.attempts), usedHelp: true })), []);
  const finishMission = useCallback(() => setMission((current) => ({ ...current, attempts: Math.max(1, current.attempts), completed: true })), []);

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
    role, sessionRole, availableRoles, currentUser, participantOnboardingCompleted, authReady,
    acceptAuthenticatedAccount, selectSessionRole, completeParticipantOnboarding, signOut, preferences, setPreference, mission,
    participantProgress: mission.completed ? 80 : 72, startMission, requestMissionHelp, finishMission,
    audioMessage, notice, playInstruction, showNotice, managedUsers, removeManagedUser,
  }), [
    acceptAuthenticatedAccount, audioMessage, authReady, availableRoles, completeParticipantOnboarding, currentUser, finishMission,
    managedUsers, mission, notice, participantOnboardingCompleted, playInstruction, preferences,
    removeManagedUser, requestMissionHelp, role, selectSessionRole, sessionRole, setPreference,
    showNotice, signOut, startMission,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
