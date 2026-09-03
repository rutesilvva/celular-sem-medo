import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Card, ProgressBar, SectionTitle, Tag } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useMissionCatalog } from '@/hooks/useMissionData';
import { useParticipantCategoryProgress, useParticipantProgress } from '@/hooks/useProgressData';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

const difficultyLabels = { easy: 'Fácil', medium: 'Média', hard: 'Difícil' };

export default function ParticipantHomeScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const missionQuery = useMissionCatalog();
  const progressQuery = useParticipantProgress();
  const categoryQuery = useParticipantCategoryProgress();
  const recommendedMission = missionQuery.data?.[0];
  const progress = progressQuery.data;
  const displayName = currentUser?.name || 'Aluno';
  const firstName = displayName.split(/\s+/)[0];
  const milestones = getMilestones(progress);
  const weeklyMomentum = getWeeklyMomentum(progress);
  const challenge = getDailyChallenge(progress);
  const evolutionSummary = getEvolutionSummary(progress);

  return (
    <Screen footer={<ParticipantNav active="home" />} contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.greeting}>
          <AppText variant="small" color={colors.textMuted}>Olá,</AppText>
          <AppText accessibilityRole="header" variant="heading" weight="800" color={colors.primary}>
            {displayName}
          </AppText>
        </View>
        <AudioButton
          compact
          label="Ouvir resumo da tela inicial"
          message={`Bom dia, ${firstName}. Você concluiu ${progress?.completed_missions ?? 0} missões. Sua trilha está em ${progress?.progress_percent ?? 0} por cento.`}
        />
      </View>

      <Card style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View style={styles.progressIcon}>
            <Ionicons name="sparkles" size={28} color={colors.warning} />
          </View>
          <View style={styles.progressCopy}>
            <AppText variant="small" weight="800" color={colors.primary}>PROGRESSO GERAL</AppText>
            <AppText weight="800">Seu progresso geral</AppText>
            <AppText variant="small" color={colors.textMuted}>Continue praticando no seu ritmo.</AppText>
          </View>
          <View style={styles.progressValueBox}>
            <AppText variant="heading" weight="800" color={colors.primary}>{progress?.progress_percent ?? 0}%</AppText>
          </View>
        </View>
        <ProgressBar value={progress?.progress_percent ?? 0} height={14} />
      </Card>

      <View style={styles.insightRow}>
        <View style={styles.insightChip}>
          <Ionicons name="flash-outline" size={18} color={colors.primary} />
          <AppText variant="small" weight="700">{progress?.completed_missions ?? 0} missões</AppText>
        </View>
        <View style={styles.insightChip}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
          <AppText variant="small" weight="700">{progress?.progress_percent ?? 0}% autonomia</AppText>
        </View>
        <View style={styles.insightChip}>
          <Ionicons name="flame-outline" size={18} color={colors.warning} />
          <AppText variant="small" weight="700">{progress?.practice_streak_days ?? 0}d streak</AppText>
        </View>
      </View>

      <SectionTitle>Seu ritmo atual</SectionTitle>
      <View style={styles.milestoneGrid}>
        {milestones.map((item) => (
          <Card key={item.label} style={styles.milestoneCard}>
            <AppText variant="caption" weight="700" color={colors.textMuted}>{item.label}</AppText>
            <AppText variant="heading" weight="800" color={item.color}>{item.value}</AppText>
            <AppText variant="small" color={colors.textMuted}>{item.helper}</AppText>
          </Card>
        ))}
      </View>

      <Card style={styles.evolutionCard}>
        <View style={styles.evolutionHeader}>
          <View style={styles.evolutionTitleGroup}>
            <AppText variant="small" weight="800" color={colors.primary}>7 DIAS DE EVOLUÇÃO</AppText>
            <AppText variant="heading" weight="800">{evolutionSummary.label}</AppText>
          </View>
          <Tag label={evolutionSummary.tag} tone={evolutionSummary.tagTone} />
        </View>

        <View style={styles.weeklyChart}>
          {weeklyMomentum.map((day) => (
            <View key={day.label} style={styles.weeklyBarGroup}>
              <AppText variant="caption" color={colors.textMuted}>{day.label}</AppText>
              <View style={[styles.weeklyBarTrack, { height: 78 }]}>
                <View style={[styles.weeklyBarFill, { height: `${day.value}%`, backgroundColor: day.value >= 80 ? colors.success : day.value >= 55 ? colors.primary : colors.warning }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.evolutionMetaRow}>
          <View style={styles.evolutionMetaPill}>
            <Ionicons name="flash-outline" size={16} color={colors.primary} />
            <AppText variant="small" weight="700">{challenge.title}</AppText>
          </View>
          <View style={styles.evolutionMetaPill}>
            <Ionicons name="trending-up-outline" size={16} color={colors.success} />
            <AppText variant="small" weight="700">{evolutionSummary.progress}% de foco</AppText>
          </View>
        </View>
      </Card>

      <SectionTitle
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver todas as missões"
            hitSlop={8}
            onPress={() => router.push('/participant/missions')}
            style={styles.sectionAction}
          >
            <AppText variant="small" weight="800" color={colors.primary}>Ver todas</AppText>
          </Pressable>
        }
      >
        Missão recomendada
      </SectionTitle>

      {missionQuery.loading ? (
        <DataState kind="loading" title="Carregando recomendação" message="Buscando a missão publicada para sua turma." />
      ) : missionQuery.error ? (
        <DataState kind="error" title="Não foi possível carregar" message="Verifique sua conexão e tente novamente." onRetry={missionQuery.retry} />
      ) : !recommendedMission ? (
        <DataState kind="empty" title="Nenhuma missão disponível" message="Sua turma ainda não possui conteúdo publicado." />
      ) : <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${recommendedMission.title}, missão recomendada, duração de ${recommendedMission.estimatedMinutes} minutos`}
        accessibilityHint="Abre os detalhes da missão"
        onPress={() => router.push({ pathname: '/participant/mission-details', params: { assignmentId: recommendedMission.assignmentId } })}
        style={({ pressed }) => [styles.missionCard, pressed && styles.pressed]}
      >
        <View style={styles.missionTop}>
          <View style={styles.missionIcon}>
            <Ionicons name="image-outline" size={34} color={colors.primary} />
          </View>
          <Tag label="Recomendada" tone="purple" />
        </View>
        <View style={styles.missionCopy}>
          <AppText variant="heading" weight="800">{recommendedMission.title}</AppText>
          <AppText color={colors.textMuted}>{recommendedMission.summary}</AppText>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={20} color={colors.iconMuted} />
            <AppText variant="small" color={colors.textMuted}>{recommendedMission.estimatedMinutes} min</AppText>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="leaf-outline" size={20} color={colors.success} />
            <AppText variant="small" color={colors.textMuted}>{difficultyLabels[recommendedMission.difficulty]}</AppText>
          </View>
        </View>
        <View style={styles.missionButton}>
          <AppText weight="800" color={colors.surface}>Ver missão</AppText>
          <Ionicons name="arrow-forward" size={22} color={colors.surface} />
        </View>
      </Pressable>}

      <SectionTitle>Conquistas em destaque</SectionTitle>
      <View style={styles.badgeRow}>
        {getBadges(progress).map((badge) => (
          <View key={badge.label} style={[styles.badge, badge.active && styles.badgeActive]}>
            <Ionicons name={badge.icon} size={18} color={badge.active ? colors.primary : colors.iconMuted} />
            <AppText variant="small" weight="700" color={badge.active ? colors.primary : colors.textMuted}>{badge.label}</AppText>
          </View>
        ))}
      </View>

      <SectionTitle>Áreas de aprendizagem</SectionTitle>
      <View accessibilityRole="list" style={styles.areaGrid}>
        {categoryQuery.data.map((area) => {
          const appearance = categoryAppearance(area.category);
          return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${area.category}. ${area.completed_missions} de ${area.assigned_missions}. ${area.progress_percent}% concluído.`}
            accessibilityHint="Abre a lista de missões"
            key={`${area.class_id}:${area.category}`}
            onPress={() => router.push('/participant/missions')}
            style={({ pressed }) => [styles.areaCard, pressed && styles.pressed]}
          >
            <View style={[styles.areaIcon, { backgroundColor: appearance.background }]}>
              <Ionicons name={appearance.icon} size={27} color={appearance.color} />
            </View>
            <View style={styles.areaCopy}>
              <AppText weight="800">{area.category}</AppText>
              <AppText variant="caption" color={colors.textMuted}>{area.completed_missions} de {area.assigned_missions} missões</AppText>
            </View>
            <ProgressBar value={area.progress_percent} color={appearance.color} height={7} />
          </Pressable>
        );})}
      </View>

      <Card style={styles.helpCard}>
        <View style={styles.helpIcon}>
          <Ionicons name="help-buoy-outline" size={28} color={colors.blue} />
        </View>
        <View style={styles.helpCopy}>
          <AppText weight="800">Você nunca pratica sozinho</AppText>
          <AppText variant="small" color={colors.textMuted}>
            Em cada etapa, use o botão de áudio ou peça uma dica.
          </AppText>
        </View>
      </Card>
    </Screen>
  );
}

function getMilestones(progress: { completed_missions?: number; progress_percent?: number; practice_streak_days?: number } | null | undefined) {
  const completed = progress?.completed_missions ?? 0;
  const streak = progress?.practice_streak_days ?? 0;
  const autonomy = progress?.progress_percent ?? 0;

  return [
    { label: 'Missões', value: `${completed}`, helper: 'concluídas', color: colors.primary },
    { label: 'Sequência', value: `${streak}d`, helper: 'de prática', color: colors.warning },
    { label: 'Trilha', value: `${autonomy}%`, helper: 'em progresso', color: colors.success },
  ];
}

function getDailyChallenge(progress: { completed_missions?: number; progress_percent?: number } | null | undefined) {
  const completed = progress?.completed_missions ?? 0;
  const remaining = Math.max(1, 2 - completed);
  return {
    title: completed >= 2 ? 'Meta de rotina concluída' : `Completar ${remaining} missão${remaining > 1 ? 's' : ''} hoje`,
    description: completed >= 2 ? 'Você manteve o ritmo e está evoluindo com confiança.' : 'Uma prática curta já ajuda a manter a rotina e a autonomia no celular.',
  };
}

function getEvolutionSummary(progress: { completed_missions?: number; progress_percent?: number } | null | undefined) {
  const percent = Number(progress?.progress_percent ?? 0);
  const completed = Number(progress?.completed_missions ?? 0);

  if (percent >= 75 || completed >= 5) {
    return { label: 'Você está em alta', tag: 'Muito bem', tagTone: 'green' as const, progress: Math.min(99, percent + 12) };
  }
  if (percent >= 45) {
    return { label: 'Ritmo constante', tag: 'Progredindo', tagTone: 'purple' as const, progress: Math.min(90, percent + 8) };
  }
  return { label: 'Continue praticando', tag: 'Em foco', tagTone: 'yellow' as const, progress: Math.max(28, percent + 5) };
}

function getWeeklyMomentum(progress: { completed_missions?: number; progress_percent?: number } | null | undefined) {
  const completed = progress?.completed_missions ?? 0;
  const percent = progress?.progress_percent ?? 0;
  const base = [42, 55, 48, 70, 82, 74, Math.min(100, 55 + (Number(percent) / 2))];
  const delta = Math.min(18, Number(completed) * 4);
  return [
    { label: 'S', value: Math.max(18, Number(base[0]) + delta) },
    { label: 'T', value: Math.max(18, Number(base[1]) + delta) },
    { label: 'Q', value: Math.max(18, Number(base[2]) + delta) },
    { label: 'Q', value: Math.max(24, Number(base[3]) + delta) },
    { label: 'S', value: Math.max(24, Number(base[4]) + delta) },
    { label: 'S', value: Math.max(24, Number(base[5]) + delta) },
    { label: 'D', value: Math.max(28, Number(base[6])) },
  ];
}

function getBadges(progress: { completed_missions?: number; progress_percent?: number } | null | undefined) {
  const completed = progress?.completed_missions ?? 0;
  const percent = progress?.progress_percent ?? 0;
  const badges = [
    { label: 'Primeira missão', icon: 'checkmark-circle-outline' as const, active: completed >= 1 },
    { label: 'Foco', icon: 'sparkles-outline' as const, active: completed >= 3 },
    { label: 'Autonomia', icon: 'shield-checkmark-outline' as const, active: percent >= 70 },
  ];
  return badges;
}

function categoryAppearance(category: string) {
  if (category === 'Mensagens') return { icon: 'chatbubbles-outline' as const, color: colors.primary, background: colors.primarySoft };
  if (category === 'Segurança digital') return { icon: 'shield-checkmark-outline' as const, color: colors.success, background: colors.successSoft };
  if (category === 'Mobilidade') return { icon: 'car-outline' as const, color: colors.blue, background: colors.blueSoft };
  return { icon: 'apps-outline' as const, color: '#8A6000', background: colors.warningSoft };
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionAction: { justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.sm },
  greeting: { flex: 1 },
  milestoneGrid: { flexDirection: 'row', gap: spacing.md },
  milestoneCard: {
    backgroundColor: '#FFFDFE',
    borderColor: colors.primaryMuted,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    flex: 1,
    gap: spacing.xs,
    minHeight: 112,
    padding: spacing.md,
  },
  evolutionCard: {
    backgroundColor: '#F7F0FF',
    borderColor: colors.primaryMuted,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    gap: spacing.md,
    padding: spacing.lg,
  },
  evolutionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  evolutionTitleGroup: { flex: 1, gap: 2 },
  weeklyChart: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  weeklyBarGroup: { alignItems: 'center', flex: 1, gap: spacing.xs },
  weeklyBarTrack: {
    alignItems: 'flex-end',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '100%',
  },
  weeklyBarFill: { borderBottomLeftRadius: radius.sm, borderBottomRightRadius: radius.sm, width: '100%' },
  evolutionMetaRow: { flexDirection: 'row', gap: spacing.sm },
  evolutionMetaPill: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    alignItems: 'center',
    backgroundColor: '#F8F5FB',
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  badgeActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted },
  progressCard: {
    backgroundColor: '#F9F1FF',
    borderColor: '#E2CBFF',
    borderRadius: radius.xl,
    borderWidth: 1.5,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadow,
  },
  progressTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  progressIcon: {
    alignItems: 'center',
    backgroundColor: '#F9E7B7',
    borderColor: '#F2D48A',
    borderRadius: radius.round,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  progressCopy: { flex: 1, gap: 2 },
  progressValueBox: {
    alignItems: 'center',
    backgroundColor: '#FFFDFD',
    borderColor: colors.primaryMuted,
    borderRadius: radius.md,
    borderWidth: 1.5,
    minWidth: 88,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  insightRow: { flexDirection: 'row', gap: spacing.sm },
  insightChip: {
    alignItems: 'center',
    backgroundColor: '#FFFDFD',
    borderColor: '#E8DEF6',
    borderRadius: radius.round,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  missionCard: {
    backgroundColor: '#FDF8FF',
    borderColor: colors.primary,
    borderRadius: radius.xl,
    borderWidth: 2,
    gap: spacing.lg,
    padding: spacing.xl,
    ...shadow,
  },
  missionTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  missionIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    height: 66,
    justifyContent: 'center',
    width: 66,
  },
  missionCopy: { gap: spacing.xs },
  metaRow: { flexDirection: 'row', gap: spacing.xl },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  missionButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  areaCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: '46%',
    flexGrow: 1,
    gap: spacing.md,
    minHeight: 166,
    minWidth: 132,
    padding: spacing.lg,
    ...shadow,
  },
  areaIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  areaCopy: { flex: 1, gap: spacing.xs },
  helpCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  helpIcon: {
    alignItems: 'center',
    backgroundColor: colors.blueSoft,
    borderRadius: radius.round,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  helpCopy: { flex: 1, gap: spacing.xs },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
