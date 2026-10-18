import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, MetricCard, ProgressBar, SectionTitle, Tag } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useMissionCatalog } from '@/hooks/useMissionData';
import { useEvolutionTimeline, useParticipantProgress } from '@/hooks/useProgressData';
import { buildEvolutionStory } from '@/features/impact/story';
import { deleteReportFiles, exportReportFiles } from '@/lib/report-export';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

export default function ParticipantProgressScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const progressQuery = useParticipantProgress();
  const missionQuery = useMissionCatalog();
  const timelineQuery = useEvolutionTimeline();

  if (progressQuery.loading) return <ProgressState kind="loading" retry={progressQuery.retry} />;
  if (progressQuery.error || !progressQuery.data) return <ProgressState kind={progressQuery.error ? 'error' : 'empty'} retry={progressQuery.retry} />;
  const progress = progressQuery.data;
  const recommended = missionQuery.data?.find((mission) => mission.assignmentId !== progress.latest_assignment_id) ?? missionQuery.data?.[0];
  const completionLabel = progress.latest_completion_kind === 'with_help' ? 'com ajuda' : progress.latest_completion_kind === 'with_hint' ? 'com uma dica' : 'com autonomia';
  const badges = getProgressBadges(progress);
  const exportEvolution = async () => {
    const rows = timelineQuery.data.flatMap((item, index) => [
      { label: `Missão ${index + 1}`, value: item.title }, { label: 'Data', value: new Date(item.occurred_at).toLocaleDateString('pt-BR') },
      { label: 'Confiança antes/depois', value: item.confidence_after ? `${item.confidence_before} → ${item.confidence_after}` : 'Não respondida' },
      { label: 'Autonomia', value: item.autonomous ? 'Concluída sem ajuda' : `Usou ${item.help_count} apoio(s)` },
    ]);
    try {
      const files = await exportReportFiles(rows, 'Minha evolução no Celular Sem Medo', 'relatorio-evolucao');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(files.pdfPath, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar minha evolução' });
      else Alert.alert('Relatório criado', 'O compartilhamento não está disponível neste aparelho.');
      await deleteReportFiles([files.csvPath, files.pdfPath]);
    } catch { Alert.alert('Não foi possível criar o relatório', 'Tente novamente em alguns instantes.'); }
  };

  return (
    <Screen footer={<ParticipantNav active="progress" />} contentStyle={styles.content}>
      <Header title="Meu progresso" subtitle="Cada tentativa conta." audio />
      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.levelIcon}><Ionicons name="ribbon" size={38} color={colors.warning} /></View>
          <View style={styles.heroCopy}>
            <AppText variant="small" weight="800" color={colors.primary}>Minha trilha</AppText>
            <AppText variant="subheading" weight="800">Aprendizagem no seu ritmo</AppText>
            <AppText variant="small" color={colors.textMuted}>{progress.completed_missions > 0 ? 'Você está cada vez mais independente.' : 'Sua primeira prática já está preparada.'}</AppText>
          </View>
          <Tag label={`${progress.progress_percent}%`} tone="purple" />
        </View>
        <View style={styles.progressHeading}><AppText variant="small" weight="700">Progresso da trilha</AppText><AppText variant="small" weight="800" color={colors.primary}>{progress.progress_percent}%</AppText></View>
        <ProgressBar value={progress.progress_percent} height={12} />
      </Card>

      <View style={styles.summaryRow}>
        <View style={styles.summaryPill}><Ionicons name="checkmark-circle-outline" size={22} color={colors.success} /><AppText weight="700">Você concluiu {progress.completed_missions} {progress.completed_missions === 1 ? 'missão' : 'missões'}.</AppText></View>
        <View style={styles.summaryPill}><Ionicons name="hand-left-outline" size={22} color={colors.primary} /><AppText weight="700">{progress.latest_completion_kind === 'autonomous' ? 'Na atividade mais recente, você terminou sem pedir ajuda.' : progress.latest_completion_kind === 'with_hint' ? 'Na atividade mais recente, você usou uma dica.' : progress.latest_completion_kind === 'with_help' ? 'Na atividade mais recente, você recebeu ajuda.' : 'Pratique uma missão para acompanhar o que já consegue fazer.'}</AppText></View>
      </View>

      <View style={styles.metricsRow}>
        <MetricCard icon="checkmark-circle-outline" value={`${progress.completed_missions}`} label="Missões concluídas" tone="green" />
        <MetricCard icon="flame-outline" value={`${progress.practice_streak_days} ${progress.practice_streak_days === 1 ? 'dia' : 'dias'}`} label="Sequência de prática" tone="yellow" />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard icon="hand-left-outline" value={`${progress.autonomy_percent}%`} label="Atividades concluídas sem ajuda" tone="purple" />
        <MetricCard icon="help-circle-outline" value={`${progress.difficulty_percent}%`} label="Atividades em que houve dificuldade" tone="blue" />
      </View>

      <SectionTitle>Linha do tempo da evolução</SectionTitle>
      {timelineQuery.loading ? <DataState kind="loading" title="Montando sua história" message="Organizando suas conquistas." /> : !timelineQuery.data.length ? <DataState kind="empty" title="Sua linha do tempo começa aqui" message="Conclua uma missão para registrar confiança e autonomia." /> : <>
        <Card style={styles.storyIntro}><Ionicons name="book-outline" size={28} color={colors.primary} /><View style={styles.heroCopy}><AppText weight="800">Minha história de evolução</AppText><AppText variant="small" color={colors.textMuted}>Cada registro mostra o que você praticou, os apoios usados e a confiança conquistada.</AppText></View></Card>
        <View style={styles.timeline}>{timelineQuery.data.slice(0, 10).map((item) => { const story = buildEvolutionStory(item); return <Card key={`${item.occurred_at}-${item.title}`} style={styles.timelineCard}>
          <View style={styles.timelineHeading}><View style={styles.timelineDot} /><View style={styles.heroCopy}><AppText variant="caption" weight="800" color={colors.primary}>Competência praticada</AppText><AppText weight="800">{item.title}</AppText><AppText variant="caption" color={colors.textMuted}>{new Date(item.occurred_at).toLocaleDateString('pt-BR')} · {item.category}</AppText></View><Tag label={item.autonomous ? 'Sem ajuda' : 'Com apoio'} tone={item.autonomous ? 'green' : 'yellow'} /></View>
          <View style={styles.storyPoints}><StoryPoint icon="phone-portrait-outline" text={story.practice} /><StoryPoint icon="hand-left-outline" text={story.autonomy} /><StoryPoint icon="trending-up-outline" text={story.confidence} /><StoryPoint icon="ribbon-outline" text={story.competence} /></View>
        </Card>; })}</View>
        <Button label="Gerar meu relatório em PDF" icon="document-text-outline" variant="secondary" onPress={() => void exportEvolution()} />
      </>}

      <SectionTitle>Conquistas</SectionTitle>
      <Button label="Ver meu certificado" icon="ribbon-outline" variant="soft" onPress={() => router.push('/participant/certificate')} />
      <View style={styles.badgeRow}>
        {badges.map((badge) => (
          <View key={badge.label} style={[styles.badge, badge.active && styles.badgeActive]}>
            <Ionicons name={badge.icon} size={18} color={badge.active ? colors.primary : colors.iconMuted} />
            <AppText variant="small" weight="700" color={badge.active ? colors.primary : colors.textMuted}>{badge.label}</AppText>
          </View>
        ))}
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

function StoryPoint({ icon, text }: { icon: 'phone-portrait-outline' | 'hand-left-outline' | 'trending-up-outline' | 'ribbon-outline'; text: string }) {
  return <View style={styles.storyPoint}><Ionicons name={icon} size={18} color={colors.primary} /><AppText variant="small" style={styles.storyPointCopy}>{text}</AppText></View>;
}

function getProgressBadges(progress: { completed_missions?: number; autonomy_percent?: number; progress_percent?: number }) {
  return [
    { label: 'Primeira missão', icon: 'checkmark-circle-outline' as const, active: (progress.completed_missions ?? 0) >= 1 },
    { label: 'Sequência', icon: 'flame-outline' as const, active: (progress.progress_percent ?? 0) >= 40 },
    { label: 'Autonomia', icon: 'shield-checkmark-outline' as const, active: (progress.autonomy_percent ?? 0) >= 70 },
  ];
}

function ProgressState({ kind, retry }: { kind: 'loading' | 'error' | 'empty'; retry: () => void }) {
  return <Screen footer={<ParticipantNav active="progress" />}><Header title="Meu progresso" /><DataState kind={kind} title={kind === 'loading' ? 'Calculando seu progresso' : kind === 'error' ? 'Não foi possível carregar' : 'Progresso indisponível'} message="Os dados da sua turma não estão disponíveis agora." onRetry={retry} /></Screen>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg }, heroCard: { backgroundColor: '#F9F1FF', borderColor: '#E3CFFC', borderRadius: radius.xl, borderWidth: 1.5, gap: spacing.md, padding: spacing.lg, ...shadow }, heroTop: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, levelIcon: { alignItems: 'center', backgroundColor: '#F9E7B7', borderColor: '#F3D68A', borderRadius: radius.round, borderWidth: 1, height: 70, justifyContent: 'center', width: 70 }, heroCopy: { flex: 1, gap: spacing.xs, minWidth: 220 }, progressHeading: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }, summaryRow: { gap: spacing.sm }, summaryPill: { alignItems: 'flex-start', backgroundColor: '#FFFDFD', borderColor: '#E8DEF6', borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.md }, metricsRow: { gap: spacing.md }, storyIntro: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primary, flexDirection: 'row', gap: spacing.md }, timeline: { gap: spacing.sm }, timelineCard: { gap: spacing.md }, timelineHeading: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, timelineDot: { backgroundColor: colors.primary, borderRadius: radius.round, height: 14, width: 14 }, storyPoints: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.sm, paddingTop: spacing.md }, storyPoint: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm }, storyPointCopy: { flex: 1 }, badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, badge: { alignItems: 'center', backgroundColor: '#F8F5FB', borderColor: colors.border, borderRadius: radius.round, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, badgeActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted }, achievementCard: { alignItems: 'flex-start', backgroundColor: '#FFFDFD', borderColor: '#E8DEF6', borderRadius: radius.xl, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md }, achievementIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 60, justifyContent: 'center', width: 60 }, achievementCopy: { flex: 1, gap: spacing.xs }, achievementHeading: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' }, nextMission: { alignItems: 'center', backgroundColor: '#FEFCFF', borderColor: colors.primaryMuted, borderRadius: radius.lg, borderWidth: 1.5, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, minHeight: 104, padding: spacing.lg }, nextMissionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 54, justifyContent: 'center', width: 54 }, nextMissionCopy: { flex: 1, gap: 2, minWidth: 200 }, pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
