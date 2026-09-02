import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

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
  audioRate: number;
  reduceMotion: boolean;
  hapticFeedback: boolean;
  repeatInstructions: boolean;
};

type AppContextValue = {
  preferences: AccessibilityPreferences;
  preferencesReady: boolean;
  preferencesSyncStatus: 'idle' | 'loading' | 'saving' | 'error';
  setPreference: <K extends keyof AccessibilityPreferences>(key: K, value: AccessibilityPreferences[K]) => void;
  retryPreferencesSync: () => void;
  audioMessage: string | null;
  audioStatus: 'idle' | 'loading' | 'speaking' | 'paused' | 'error';
  audioError: string | null;
  notice: string | null;
  playInstruction: (message?: string) => void;
  pauseInstruction: () => void;
  resumeInstruction: () => void;
  stopInstruction: () => void;
  repeatInstruction: () => void;
  showNotice: (message: string) => void;
  managedUsers: ManagedUser[];
  removeManagedUser: (userId: string) => boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

export const defaultPreferences: AccessibilityPreferences = {
  largerText: true,
  highContrast: true,
  autoAudio: true,
  voiceResponse: false,
  audioRate: 0.9,
  reduceMotion: false,
  hapticFeedback: true,
  repeatInstructions: false,
};

export function AppProvider({ children }: PropsWithChildren) {
  const auth = useOptionalAuth();
  const userId = auth?.status === 'authenticated' ? auth.currentUser?.id ?? null : null;
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [preferencesOwnerId, setPreferencesOwnerId] = useState<string | null>(null);
  const [preferencesSyncStatus, setPreferencesSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('idle');
  const [audioMessage, setAudioMessage] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<AppContextValue['audioStatus']>('idle');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [managedUsers, setManagedUsers] = useState(initialManagedUsers);
  const lastInstruction = useRef<string | null>(null);
  const speechGeneration = useRef(0);
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
    void Speech.stop();
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

  const setPreference = useCallback(<K extends keyof AccessibilityPreferences>(key: K, value: AccessibilityPreferences[K]) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      persistPreferences(next);
      return next;
    });
  }, [persistPreferences]);

  const retryPreferencesSync = useCallback(() => persistPreferences(preferences), [persistPreferences, preferences]);

  const playInstruction = useCallback((message = 'Ouça esta instrução com calma.') => {
    const generation = ++speechGeneration.current;
    lastInstruction.current = message;
    setAudioMessage(message);
    setAudioError(null);
    setAudioStatus('loading');
    void Speech.stop().then(async () => {
      const voices = await Speech.getAvailableVoicesAsync();
      if (generation !== speechGeneration.current) return;
      const portugueseVoice = voices.find((voice) => /^pt-BR$/i.test(voice.language))
        ?? voices.find((voice) => /^pt(?:-|$)/i.test(voice.language));
      if (voices.length > 0 && !portugueseVoice) {
        setAudioStatus('error');
        setAudioError('A voz em português não está disponível neste aparelho. Instale o idioma português nas configurações do sistema.');
        return;
      }
      Speech.speak(message.slice(0, Speech.maxSpeechInputLength), {
        language: 'pt-BR',
        voice: portugueseVoice?.identifier,
        rate: preferences.audioRate,
        onStart: () => {
          if (generation === speechGeneration.current) setAudioStatus('speaking');
        },
        onDone: () => {
          if (generation === speechGeneration.current) {
            if (preferences.repeatInstructions) {
              Speech.speak(message.slice(0, Speech.maxSpeechInputLength), {
                language: 'pt-BR', voice: portugueseVoice?.identifier, rate: preferences.audioRate,
                onDone: () => { if (generation === speechGeneration.current) { setAudioStatus('idle'); setAudioMessage(null); } },
                onError: () => { if (generation === speechGeneration.current) setAudioStatus('error'); },
              });
              return;
            }
            setAudioStatus('idle');
            setAudioMessage(null);
          }
        },
        onStopped: () => {
          if (generation === speechGeneration.current) setAudioStatus('idle');
        },
        onError: () => {
          if (generation === speechGeneration.current) {
            setAudioStatus('error');
            setAudioError('Não foi possível reproduzir a instrução neste aparelho.');
          }
        },
      });
    }).catch(() => {
      setAudioStatus('error');
      setAudioError('Não foi possível acessar a voz do aparelho.');
    });
  }, [preferences.audioRate, preferences.repeatInstructions]);

  const pauseInstruction = useCallback(() => {
    if (Platform.OS === 'android') {
      speechGeneration.current += 1;
      void Speech.stop();
    } else void Speech.pause();
    setAudioStatus('paused');
  }, []);
  const resumeInstruction = useCallback(() => {
    if (Platform.OS === 'android') {
      if (lastInstruction.current) playInstruction(lastInstruction.current);
    } else {
      void Speech.resume();
      setAudioStatus('speaking');
    }
  }, [playInstruction]);
  const stopInstruction = useCallback(() => {
    speechGeneration.current += 1;
    void Speech.stop();
    setAudioStatus('idle');
    setAudioMessage(null);
    setAudioError(null);
  }, []);
  const repeatInstruction = useCallback(() => {
    if (lastInstruction.current) playInstruction(lastInstruction.current);
  }, [playInstruction]);

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
    audioMessage, audioStatus, audioError, notice, playInstruction, pauseInstruction,
    resumeInstruction, stopInstruction, repeatInstruction, showNotice, managedUsers, removeManagedUser,
  }), [
    audioError, audioMessage, audioStatus, managedUsers, notice, pauseInstruction, playInstruction, preferences, preferencesOwnerId,
    preferencesSyncStatus, retryPreferencesSync, userId,
    removeManagedUser, repeatInstruction, resumeInstruction, setPreference, showNotice, stopInstruction,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
