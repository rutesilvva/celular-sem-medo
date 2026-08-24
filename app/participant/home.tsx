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
  const displayName = currentUser?.name || 'Participante';
  const firstName = displayName.split(/\s+/)[0];

  return (
    <Screen footer={<ParticipantNav active="home" />} contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.greeting}>
          <AppText variant="small" color={colors.textMuted}>Bom dia,</AppText>
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
            <Ionicons name="sparkles" size={26} color={colors.warning} />
          </View>
          <View style={styles.progressCopy}>
            <AppText weight="800">Sua trilha está avançando</AppText>
            <AppText variant="small" color={colors.textMuted}>Continue praticando no seu ritmo.</AppText>
          </View>
          <AppText weight="800" color={colors.primary}>{progress?.progress_percent ?? 0}%</AppText>
        </View>
        <ProgressBar value={progress?.progress_percent ?? 0} />
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
  progressCard: { backgroundColor: '#FBF8FF', gap: spacing.md },
  progressTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  progressIcon: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.round,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  progressCopy: { flex: 1, gap: 2 },
  missionCard: {
    backgroundColor: colors.surface,
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
