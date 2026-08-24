import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  completionKind,
  initialMissionRunState,
  isExpectedAction,
  missionRunReducer,
  type MissionAction,
  type MissionRunState,
} from '@/features/mission-engine/executor';
import { appendAttemptEvent, setMissionAttemptProgress, startOrResumeMissionAttempt } from '@/lib/backend';
import type { ParticipantMissionStep } from '@/lib/backend';

type AttemptEventType = Parameters<typeof appendAttemptEvent>[0]['eventType'];

export function useMissionEngine(assignmentId: string, steps: ParticipantMissionStep[]) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [sequence, setSequence] = useState(1);
  const [run, setRun] = useState<MissionRunState>(initialMissionRunState);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const startedFor = useRef<string | null>(null);
  const eventTimes = useRef<Record<number, string>>({});
  const occurredAt = useCallback((eventSequence: number) => {
    eventTimes.current[eventSequence] ??= new Date().toISOString();
    return eventTimes.current[eventSequence];
  }, []);

  const start = useCallback(async () => {
    if (!steps.length) return;
    setLoading(true);
    setError(null);
    try {
      const attempt = await startOrResumeMissionAttempt(assignmentId, createUuid());
      const restoredIndex = Math.max(0, steps.findIndex((step) => step.id === attempt.current_step_id));
      if (!mounted.current) return;
      setAttemptId(attempt.attempt_id);
      setSequence(attempt.next_sequence_number);
      setRun({
        ...initialMissionRunState,
        stepIndex: restoredIndex,
        completed: attempt.attempt_status === 'completed',
        mistakes: attempt.mistake_count,
        usedHint: attempt.used_hint,
        usedHelp: attempt.used_help,
      });
      if (attempt.attempt_status === 'in_progress') {
        await record(attempt.attempt_id, attempt.next_sequence_number, attempt.next_sequence_number === 1 ? 'attempt_started' : 'attempt_resumed', steps[restoredIndex]?.id, occurredAt(attempt.next_sequence_number));
        if (mounted.current) setSequence(attempt.next_sequence_number + 1);
      }
    } catch {
      if (mounted.current) setError('Não foi possível iniciar ou restaurar esta tentativa.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [assignmentId, occurredAt, steps]);

  useEffect(() => {
    mounted.current = true;
    const startKey = `${assignmentId}:${steps.map((step) => step.id).join(',')}`;
    if (startedFor.current === startKey) return () => { mounted.current = false; };
    startedFor.current = startKey;
    void start();
    return () => { mounted.current = false; };
  }, [assignmentId, start, steps]);

  const currentStep = steps[run.stepIndex] ?? steps[0] ?? null;

  const submit = useCallback(async (action: MissionAction) => {
    if (!attemptId || !currentStep || busy || run.completed) return;
    setBusy(true);
    setError(null);
    const correct = isExpectedAction(currentStep.expectedAction, action);
    const lastStep = run.stepIndex === steps.length - 1;
    try {
      await record(attemptId, sequence, correct ? 'action_succeeded' : 'action_failed', currentStep.id, occurredAt(sequence));
      let nextSequence = sequence + 1;
      if (correct) {
        const nextStep = steps[run.stepIndex + 1] ?? currentStep;
        if (lastStep) {
          await record(attemptId, nextSequence, 'attempt_completed', currentStep.id, occurredAt(nextSequence));
          nextSequence += 1;
        }
        await setMissionAttemptProgress({ attemptId, stepId: nextStep.id, completed: lastStep });
      }
      setRun((value) => missionRunReducer(value, { type: 'answer', correct, lastStep }));
      setSequence(nextSequence);
    } catch {
      setError('A ação não pôde ser salva. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }, [attemptId, busy, currentStep, occurredAt, run.completed, run.stepIndex, sequence, steps]);

  const registerSupport = useCallback(async (kind: 'hint' | 'help' | 'audio') => {
    if (!attemptId || !currentStep || busy) return;
    setBusy(true);
    const eventType: AttemptEventType = kind === 'hint' ? 'hint_requested' : kind === 'help' ? 'help_requested' : 'audio_started';
    try {
      await record(attemptId, sequence, eventType, currentStep.id, occurredAt(sequence));
      setSequence((value) => value + 1);
      if (kind !== 'audio') setRun((value) => missionRunReducer(value, { type: kind }));
    } catch {
      setError('Não foi possível registrar o apoio agora.');
    } finally {
      setBusy(false);
    }
  }, [attemptId, busy, currentStep, occurredAt, sequence]);

  return useMemo(() => ({
    attemptId, busy, completion: completionKind(run), currentStep, error, loading,
    run, retry: start, submit, registerSupport,
  }), [attemptId, busy, currentStep, error, loading, registerSupport, run, start, submit]);
}

async function record(attemptId: string, sequenceNumber: number, eventType: AttemptEventType, stepId: string | undefined, occurredAt: string) {
  return appendAttemptEvent({
    eventId: eventUuid(attemptId, sequenceNumber), attemptId, sequenceNumber, eventType, stepId,
    occurredAt,
  });
}

function eventUuid(attemptId: string, sequenceNumber: number) {
  const suffix = sequenceNumber.toString(16).padStart(12, '0').slice(-12);
  return `${attemptId.slice(0, 24)}${suffix}`;
}

function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
