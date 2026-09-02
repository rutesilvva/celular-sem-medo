import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, ProgressBar, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import type { MissionAction } from '@/features/mission-engine/executor';
import { useMissionContent } from '@/hooks/useMissionData';
import { useMissionEngine } from '@/hooks/useMissionEngine';
import type { ParticipantMissionDetails, ParticipantMissionStep } from '@/lib/backend';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

export default function ParticipantSimulatorScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId?: string }>();
  const query = useMissionContent(assignmentId ?? null);
  if (query.loading) return <SimulatorState kind="loading" retry={query.retry} />;
  if (query.error) return <SimulatorState kind="error" retry={query.retry} />;
  if (!query.data) return <SimulatorState kind="empty" retry={query.retry} />;
  return <MissionExecutor assignmentId={query.data.details.assignmentId} details={query.data.details} steps={query.data.steps} />;
}

function MissionExecutor({ assignmentId, details, steps }: { assignmentId: string; details: ParticipantMissionDetails; steps: ParticipantMissionStep[] }) {
  const router = useRouter();
  const { playInstruction, preferences, stopInstruction } = useApp();
  const engine = useMissionEngine(assignmentId, steps);
  const step = engine.currentStep;
  const lastAutoPlayedStep = useRef<string | null>(null);

  useEffect(() => {
    if (!step || !preferences.autoAudio || lastAutoPlayedStep.current === step.id) return;
    lastAutoPlayedStep.current = step.id;
    playInstruction(step.audioText);
  }, [playInstruction, preferences.autoAudio, step]);

  useEffect(() => () => stopInstruction(), [stopInstruction]);

  useEffect(() => {
    if (!engine.run.completed) return;
    router.replace({ pathname: '/participant/result', params: { assignmentId, completion: engine.completion, attemptId: engine.attemptId ?? '' } });
  }, [assignmentId, engine.attemptId, engine.completion, engine.run.completed, router]);

  if (engine.loading) return <SimulatorState kind="loading" retry={engine.retry} />;
  if (!step) return <SimulatorState kind="empty" retry={engine.retry} />;

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title={details.title} subtitle="Treino interativo — nenhuma ação real" onBack={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/participant/mission-details', params: { assignmentId } })} />
      <Card style={styles.instructionCard}>
        <View style={styles.instructionTop}>
          <AppText variant="small" weight="800" color={colors.primary}>PASSO {step.position} DE {steps.length}</AppText>
          <Tag label="Simulação segura" tone="green" />
        </View>
        <AppText variant="subheading" weight="800">{step.title}</AppText>
        <AppText color={colors.textMuted}>{step.instruction}</AppText>
        <ProgressBar value={Math.round(100 * step.position / steps.length)} height={10} />
      </Card>
      <Card style={styles.simulation}>
        <View style={styles.safeHeader}>
          <View style={styles.safeIcon}><Ionicons name="shield-checkmark" size={28} color={colors.success} /></View>
          <View style={styles.safeCopy}><AppText weight="800">Ambiente fictício</AppText><AppText variant="small" color={colors.successText}>Sem mensagens, fotos, pagamentos, GPS, downloads ou permissões reais.</AppText></View>
        </View>
        <View style={styles.taskArea}>
          <Ionicons name={iconForStep(step)} size={46} color={colors.primary} />
          <AppText variant="subheading" weight="800" style={styles.center}>{step.title}</AppText>
          <AppText color={colors.textMuted} style={styles.center}>{step.safetyNote}</AppText>
        </View>
        <StepActions step={step} busy={engine.busy} onSubmit={engine.submit} />
      </Card>
      {engine.run.mistakes > 0 ? <Card style={styles.feedback}><Ionicons name="information-circle" size={24} color={colors.warning} /><AppText style={styles.safeCopy}>Ainda não é essa opção. Nada aconteceu de verdade; tente novamente ou peça uma dica.</AppText></Card> : null}
      {engine.run.usedHint || engine.run.usedHelp ? <Card style={styles.hints}><AppText weight="800">{engine.run.usedHelp ? 'Ajuda passo a passo' : 'Dicas deste passo'}</AppText>{step.hints.map((hint) => <AppText key={hint}>• {hint}</AppText>)}</Card> : null}
      {engine.error ? <AppText color={colors.danger}>{engine.error}</AppText> : null}
      <View style={styles.supportActions}>
        <Button label="Ouvir instrução" icon="volume-high-outline" variant="secondary" disabled={engine.busy} onPress={() => { playInstruction(step.audioText); void engine.registerSupport('audio'); }} />
        <Button label="Mostrar uma dica" icon="help-circle-outline" variant="soft" disabled={engine.busy} onPress={() => void engine.registerSupport('hint')} />
        <Button label="Pedir ajuda" icon="chatbubble-ellipses-outline" variant="soft" disabled={engine.busy || !engine.attemptId} onPress={() => {
          void engine.registerSupport('help');
          router.push({ pathname: '/participant/help-requests', params: { attemptId: engine.attemptId ?? '', stepId: step.id } });
        }} />
      </View>
    </Screen>
  );
}

function StepActions({ step, busy, onSubmit }: { step: ParticipantMissionStep; busy: boolean; onSubmit: (action: MissionAction) => Promise<void> }) {
  const expected = asObject(step.expectedAction);
  const options = Array.isArray(step.options) ? step.options.filter(isOption) : [];
  if (options.length) return <View style={styles.options}>{options.map((option) => <Button key={option.id} label={option.label} variant="secondary" disabled={busy} onPress={() => void onSubmit({ action: expected.action === 'select' ? 'select' : 'choose', optionId: option.id })} />)}</View>;
  const action = expected.action === 'tap' ? 'tap' : 'continue';
  return <Button label={action === 'tap' ? labelForTarget(expected.target) : 'Continuar'} icon={action === 'tap' ? 'hand-left-outline' : 'arrow-forward'} disabled={busy} onPress={() => void onSubmit({ action, target: expected.target })} />;
}

function asObject(value: ParticipantMissionStep['expectedAction']): { action?: string; target?: string } {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as { action?: string; target?: string } : {};
}
function isOption(value: unknown): value is { id: string; label: string } {
  return Boolean(value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string' && typeof (value as { label?: unknown }).label === 'string');
}
function labelForTarget(target?: string) {
  const labels: Record<string, string> = { attachment_button: 'Tocar no clipe', location_option: 'Escolher localização' };
  return target ? labels[target] ?? 'Tocar na opção indicada' : 'Continuar';
}
function iconForStep(step: ParticipantMissionStep): 'phone-portrait-outline' | 'hand-left-outline' | 'list-outline' | 'shield-checkmark-outline' {
  if (step.type === 'instruction') return 'phone-portrait-outline';
  if (step.type === 'tap_target') return 'hand-left-outline';
  if (step.type === 'multiple_choice') return 'list-outline';
  return 'shield-checkmark-outline';
}
function SimulatorState({ kind, retry }: { kind: 'loading' | 'error' | 'empty'; retry: () => void }) {
  const router = useRouter();
  return <Screen footer={<ParticipantNav active="missions" />}><Header title="Simulador seguro" onBack={() => router.replace('/participant/missions')} /><DataState kind={kind} title={kind === 'loading' ? 'Preparando o treino' : kind === 'error' ? 'Não foi possível carregar' : 'Treino indisponível'} message="A versão publicada não está disponível para esta turma." onRetry={retry} /></Screen>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  instructionCard: { backgroundColor: '#F6EEFF', borderColor: colors.primaryMuted, gap: spacing.md },
  instructionTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  simulation: { backgroundColor: '#FFFDFB', borderColor: colors.primaryDark, borderWidth: 2, gap: spacing.xl, minHeight: 390, ...shadow },
  safeHeader: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.md },
  safeIcon: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.round, height: 52, justifyContent: 'center', width: 52 },
  safeCopy: { flex: 1 },
  taskArea: { alignItems: 'center', backgroundColor: '#F8F3FF', borderColor: colors.primaryMuted, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.lg },
  center: { textAlign: 'center' },
  options: { gap: spacing.md },
  feedback: { alignItems: 'center', backgroundColor: colors.warningSoft, flexDirection: 'row', gap: spacing.md },
  hints: { backgroundColor: colors.primarySoft, gap: spacing.sm },
  supportActions: { gap: spacing.md },
});
