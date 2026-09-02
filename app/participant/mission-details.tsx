import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { ParticipantNav } from '@/components/BottomNav';
import { ConfidencePicker } from '@/components/ConfidencePicker';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, Tag } from '@/components/ui';
import { useMissionContent } from '@/hooks/useMissionData';
import { colors, radius, spacing } from '@/theme/tokens';
import { startMissionAssessment } from '@/lib/backend';

const difficultyLabels = { easy: 'Fácil', medium: 'Média', hard: 'Difícil' };

export default function ParticipantMissionDetailsScreen() {
  const router = useRouter();
  const { assignmentId } = useLocalSearchParams<{ assignmentId?: string }>();
  const query = useMissionContent(assignmentId ?? null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);

  if (query.loading) return <State kind="loading" onRetry={query.retry} />;
  if (query.error) return <State kind="error" onRetry={query.retry} />;
  if (!query.data) return <State kind="empty" onRetry={query.retry} />;

  const { details, steps } = query.data;
  const beginTraining = async () => {
    if (!confidence || starting) return;
    setStarting(true);
    try {
      const assessmentId = await startMissionAssessment(details.assignmentId, confidence);
      router.push({ pathname: '/participant/simulator', params: { assignmentId: details.assignmentId, assessmentId } });
    } finally { setStarting(false); }
  };

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title={details.title} subtitle={`Versão ${details.version} publicada`} onBack={() => router.canGoBack() ? router.back() : router.replace('/participant/missions')} audio />

      <Card style={styles.hero}>
        <View style={styles.heroIcon}><Ionicons name="school-outline" size={48} color={colors.primary} /></View>
        <View style={styles.heroTopRow}>
          {details.required ? <Tag label="Recomendada" tone="purple" /> : null}
          <Tag label="Passo a passo" tone="green" />
        </View>
        <AppText variant="heading" weight="800" style={styles.center}>{details.learningObjective}</AppText>
        <AppText color={colors.textMuted} style={styles.center}>{details.summary}</AppText>
      </Card>

      <Card style={styles.storyCard}>
        <View style={styles.storyHeader}>
          <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
          <AppText variant="small" weight="800" color={colors.primary}>COMO A PRÁTICA FUNCIONA</AppText>
        </View>
        <AppText variant="small" color={colors.textMuted}>Você recebe instruções claras, pode ouvir a explicação e pedir ajuda a qualquer momento sem depender de outra pessoa para seguir avançando.</AppText>
      </Card>

      <Card style={styles.summaryCard}>
        <SummaryItem icon="time-outline" value={`${details.estimatedMinutes} min`} label="Duração" />
        <View style={styles.verticalDivider} />
        <SummaryItem icon="leaf-outline" value={difficultyLabels[details.difficulty]} label="Dificuldade" />
        <View style={styles.verticalDivider} />
        <SummaryItem icon="list-outline" value={`${details.stepCount}`} label="Passos" />
      </Card>

      <View style={styles.section}>
        <AppText variant="subheading" weight="800">O que você vai fazer</AppText>
        <View style={styles.steps}>
          {steps.map((step) => (
            <View key={step.id} style={styles.step}>
              <View style={styles.stepNumber}><AppText weight="800" color={colors.primary}>{step.position}</AppText></View>
              <View style={styles.stepIcon}><Ionicons name="footsteps-outline" size={24} color={colors.primary} /></View>
              <View style={styles.stepCopy}>
                <AppText weight="800">{step.title}</AppText>
                <AppText variant="small" color={colors.textMuted}>{step.instruction}</AppText>
                <AppText variant="caption" color={colors.primary}>Dica: {step.hints[0]}</AppText>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Card style={styles.reassurance}>
        <Ionicons name="shield-checkmark" size={28} color={colors.success} />
        <AppText style={styles.reassuranceCopy}>{details.safetyNote}</AppText>
      </Card>

      <View style={styles.actions}>
        <Card><ConfidencePicker label="Antes de começar, quanta confiança você sente?" value={confidence} onChange={setConfidence} /></Card>
        <AudioButton label="Ouvir explicação" message={steps.map((step) => step.audioText).join(' ')} />
        <Button label={starting ? 'Preparando…' : 'Começar treino'} icon="play" disabled={!confidence || starting} accessibilityHint="Abre o simulador seguro" onPress={() => void beginTraining()} />
      </View>
    </Screen>
  );
}

function State({ kind, onRetry }: { kind: 'loading' | 'error' | 'empty'; onRetry: () => void }) {
  const router = useRouter();
  return (
    <Screen footer={<ParticipantNav active="missions" />}>
      <Header title="Missão" onBack={() => router.replace('/participant/missions')} />
      <DataState
        kind={kind}
        title={kind === 'loading' ? 'Carregando missão' : kind === 'error' ? 'Não foi possível carregar' : 'Missão indisponível'}
        message={kind === 'empty' ? 'Ela pode ter sido removida, encerrada ou ainda não foi publicada.' : 'Buscando a versão publicada para sua turma.'}
        onRetry={onRetry}
      />
    </Screen>
  );
}

function SummaryItem({ icon, value, label }: { icon: 'time-outline' | 'leaf-outline' | 'list-outline'; value: string; label: string }) {
  return <View style={styles.summaryItem}><Ionicons name={icon} size={23} color={colors.primary} /><AppText weight="800" style={styles.center}>{value}</AppText><AppText variant="caption" color={colors.textMuted} style={styles.center}>{label}</AppText></View>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  hero: { alignItems: 'center', backgroundColor: '#F9F3FF', borderColor: colors.primaryMuted, borderRadius: radius.xl, gap: spacing.md, padding: spacing.lg },
  heroTopRow: { flexDirection: 'row', gap: spacing.sm },
  heroIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.xl, height: 94, justifyContent: 'center', width: 94 },
  center: { textAlign: 'center' },
  storyCard: { backgroundColor: colors.surface, borderColor: colors.primaryMuted, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.md },
  storyHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  summaryCard: { alignItems: 'stretch', backgroundColor: '#FFFDFC', borderColor: colors.primaryMuted, borderRadius: radius.lg, flexDirection: 'row', paddingHorizontal: spacing.sm },
  summaryItem: { alignItems: 'center', flex: 1, gap: spacing.xs, paddingHorizontal: spacing.xs },
  verticalDivider: { backgroundColor: colors.border, width: 1 },
  section: { gap: spacing.md },
  steps: { gap: spacing.md },
  step: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primaryMuted, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  stepNumber: { alignItems: 'center', justifyContent: 'center', width: 20 },
  stepIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 44, justifyContent: 'center', width: 44 },
  stepCopy: { flex: 1, gap: 2 },
  reassurance: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  reassuranceCopy: { flex: 1 },
  actions: { gap: spacing.md },
});
