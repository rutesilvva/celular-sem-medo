import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Card, Header, MetricCard, ProgressBar, SectionTitle, Tag } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useMissionCatalog } from '@/hooks/useMissionData';
import { useParticipantProgress } from '@/hooks/useProgressData';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ParticipantProgressScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const progressQuery = useParticipantProgress();
  const missionQuery = useMissionCatalog();

  if (progressQuery.loading) return <ProgressState kind="loading" retry={progressQuery.retry} />;
  if (progressQuery.error || !progressQuery.data) return <ProgressState kind={progressQuery.error ? 'error' : 'empty'} retry={progressQuery.retry} />;
  const progress = progressQuery.data;
  const recommended = missionQuery.data?.find((mission) => mission.assignmentId !== progress.latest_assignment_id) ?? missionQuery.data?.[0];
  const completionLabel = progress.latest_completion_kind === 'with_help' ? 'com ajuda' : progress.latest_completion_kind === 'with_hint' ? 'com uma dica' : 'com autonomia';

  return (
    <Screen footer={<ParticipantNav active="progress" />} contentStyle={styles.content}>
      <Header title="Meu progresso" subtitle="Cada tentativa conta." audio />
      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.levelIcon}><Ionicons name="ribbon" size={38} color={colors.warning} /></View>
          <View style={styles.heroCopy}>
            <AppText variant="small" weight="800" color={colors.primary}>MINHA TRILHA</AppText>
            <AppText variant="subheading" weight="800">Aprendizagem no seu ritmo</AppText>
            <AppText variant="small" color={colors.textMuted}>{progress.completed_missions > 0 ? 'Você está cada vez mais independente.' : 'Sua primeira prática já está preparada.'}</AppText>
          </View>
        </View>
        <View style={styles.progressHeading}><AppText variant="small" weight="700">Progresso da trilha</AppText><AppText variant="small" weight="800" color={colors.primary}>{progress.progress_percent}%</AppText></View>
        <ProgressBar value={progress.progress_percent} height={12} />
      </Card>
      <View style={styles.metricsRow}>
        <MetricCard icon="checkmark-circle-outline" value={`${progress.completed_missions}`} label="Missões concluídas" tone="green" />
        <MetricCard icon="flame-outline" value={`${progress.practice_streak_days} ${progress.practice_streak_days === 1 ? 'dia' : 'dias'}`} label="Sequência de prática" tone="yellow" />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard icon="hand-left-outline" value={`${progress.autonomy_percent}%`} label="Autonomia" tone="purple" />
        <MetricCard icon="help-circle-outline" value={`${progress.difficulty_percent}%`} label="Tentativas com apoio" tone="blue" />
      </View>

      <SectionTitle>Conquista mais recente</SectionTitle>
      {progress.latest_assignment_id && progress.latest_mission_title ? <Card style={styles.achievementCard}>
        <View style={styles.achievementIcon}><Ionicons name="trophy-outline" size={31} color={colors.primary} /></View>
        <View style={styles.achievementCopy}>
          <View style={styles.achievementHeading}><AppText weight="800">{progress.latest_mission_title}</AppText><Tag label="Concluída" tone="green" /></View>
          <AppText variant="small" color={colors.textMuted}>Você terminou esta tentativa {completionLabel}. A conquista permanece mesmo ao praticar novamente.</AppText>
        </View>
      </Card> : <DataState kind="empty" title="Sua primeira conquista está próxima" message="Conclua uma missão para acompanhar sua evolução aqui." />}

      <SectionTitle>Próxima missão recomendada</SectionTitle>
      {recommended ? <Pressable accessibilityRole="button" accessibilityLabel={`Praticar ${recommended.title}`} accessibilityHint="Abre os detalhes da missão" onPress={() => router.push({ pathname: '/participant/mission-details', params: { assignmentId: recommended.assignmentId } })} style={({ pressed }) => [styles.nextMission, pressed && styles.pressed]}>
        <View style={styles.nextMissionIcon}><Ionicons name="arrow-forward-outline" size={29} color={colors.primary} /></View>
        <View style={styles.nextMissionCopy}><AppText weight="800">{recommended.title}</AppText><AppText variant="small" color={colors.textMuted}>{recommended.estimatedMinutes} minutos de prática segura.</AppText></View>
        <Ionicons name="chevron-forward" size={24} color={colors.primary} />
      </Pressable> : <DataState kind="empty" title="Nenhuma missão disponível" message="Sua turma ainda não possui outra missão publicada." />}

      <AudioButton label="Ouvir meu progresso" message={`${currentUser?.name || 'Participante'}, você concluiu ${progress.completed_missions} missões, tem ${progress.practice_streak_days} dias de sequência e chegou a ${progress.progress_percent} por cento da trilha.`} />
    </Screen>
  );
}

function ProgressState({ kind, retry }: { kind: 'loading' | 'error' | 'empty'; retry: () => void }) {
  return <Screen footer={<ParticipantNav active="progress" />}><Header title="Meu progresso" /><DataState kind={kind} title={kind === 'loading' ? 'Calculando seu progresso' : kind === 'error' ? 'Não foi possível carregar' : 'Progresso indisponível'} message="Os dados da sua turma não estão disponíveis agora." onRetry={retry} /></Screen>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg }, heroCard: { backgroundColor: '#FBF8FF', borderColor: colors.primaryMuted, gap: spacing.md }, heroTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md }, levelIcon: { alignItems: 'center', backgroundColor: colors.warningSoft, borderRadius: radius.round, height: 68, justifyContent: 'center', width: 68 }, heroCopy: { flex: 1, gap: spacing.xs }, progressHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, metricsRow: { flexDirection: 'row', gap: spacing.md }, achievementCard: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md }, achievementIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 60, justifyContent: 'center', width: 60 }, achievementCopy: { flex: 1, gap: spacing.sm }, achievementHeading: { alignItems: 'flex-start', gap: spacing.sm }, nextMission: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radius.lg, borderWidth: 1.5, flexDirection: 'row', gap: spacing.md, minHeight: 104, padding: spacing.lg }, nextMissionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 54, justifyContent: 'center', width: 54 }, nextMissionCopy: { flex: 1, gap: spacing.xs }, pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
