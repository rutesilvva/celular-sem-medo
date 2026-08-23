import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { MonitorNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Card, Header, MetricCard, ProgressBar, SectionTitle, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { monitorMissions, participants } from '@/data/mock';
import { colors, radius, spacing } from '@/theme/tokens';

export default function MonitorHomeScreen() {
  const router = useRouter();
  const { participantProgress, showNotice } = useApp();
  const currentParticipants = participants.map((participant) => participant.id === 'maria'
    ? { ...participant, progress: participantProgress }
    : participant);
  const averageProgress = Math.round(
    currentParticipants.reduce((total, participant) => total + participant.progress, 0) / currentParticipants.length,
  );
  const averageAudio = Math.round(
    currentParticipants.reduce((total, participant) => total + participant.audio, 0) / currentParticipants.length,
  );
  const attentionParticipant = currentParticipants.find((participant) => participant.progress < 50);

  return (
    <Screen footer={<MonitorNav active="home" />}>
      <Header
        title="Visão geral"
        subtitle="Turma Conectados • manhã"
        audio
        action={undefined}
      />

      <View style={styles.welcome}>
        <View style={styles.welcomeCopy}>
          <AppText variant="heading" weight="800">Olá, Helena!</AppText>
          <AppText color={colors.textMuted}>Veja como a turma avançou esta semana.</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir notificações"
          onPress={() => showNotice('Você não tem novas notificações.')}
          style={({ pressed }) => [styles.notification, pressed && styles.pressed]}
        >
          <Ionicons name="notifications-outline" size={25} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.metricGrid}>
        <MetricCard icon="people-outline" value={`${currentParticipants.length}`} label="participantes ativos" tone="purple" />
        <MetricCard icon="trending-up-outline" value={`${averageProgress}%`} label="progresso médio" tone="green" />
      </View>
      <View style={styles.metricGrid}>
        <MetricCard icon="volume-high-outline" value={`${averageAudio}%`} label="usaram apoio em áudio" tone="blue" />
        <MetricCard icon="flag-outline" value="2" label="missões em andamento" tone="yellow" />
      </View>

      <SectionTitle
        action={(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver todos os participantes"
            onPress={() => router.push('/monitor/participants')}
            hitSlop={8}
          >
            <AppText variant="small" weight="800" color={colors.primary}>Ver todos</AppText>
          </Pressable>
        )}
      >
        Atenção recomendada
      </SectionTitle>

      {attentionParticipant ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir detalhes de ${attentionParticipant.name}`}
          accessibilityHint="Mostra progresso, dificuldades e missões recentes"
          onPress={() => router.push({ pathname: '/monitor/participant-details', params: { id: attentionParticipant.id } })}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Card style={styles.attentionCard}>
            <View style={styles.personRow}>
              <View style={styles.avatar}>
                <AppText weight="800" color={colors.primary}>{attentionParticipant.initials}</AppText>
              </View>
              <View style={styles.personCopy}>
                <AppText weight="800">{attentionParticipant.name}</AppText>
                <AppText variant="small" color={colors.textMuted}>Precisa de apoio em “Conferir um Pix”</AppText>
              </View>
              <Ionicons name="chevron-forward" size={23} color={colors.iconMuted} />
            </View>
            <View style={styles.progressCopy}>
              <AppText variant="small" weight="700">Progresso geral</AppText>
              <AppText variant="small" weight="800" color={colors.primary}>{attentionParticipant.progress}%</AppText>
            </View>
            <ProgressBar value={attentionParticipant.progress} color={colors.warning} />
            <Tag label="Acompanhar esta semana" tone="yellow" />
          </Card>
        </Pressable>
      ) : null}

      <SectionTitle>Missões da turma</SectionTitle>
      <Card style={styles.missionSummary}>
        {monitorMissions.slice(0, 2).map((mission, index) => (
          <View key={mission.title} style={[styles.missionRow, index > 0 && styles.divider]}>
            <View style={styles.missionIcon}>
              <Ionicons name={index === 0 ? 'image-outline' : 'shield-checkmark-outline'} size={24} color={colors.primary} />
            </View>
            <View style={styles.missionCopy}>
              <View style={styles.progressCopy}>
                <AppText variant="small" weight="800" style={styles.missionTitle}>{mission.title}</AppText>
                <AppText variant="small" weight="800" color={colors.primary}>{mission.completion}%</AppText>
              </View>
              <ProgressBar value={mission.completion} height={8} />
              <AppText variant="caption" color={colors.textMuted}>{mission.audio}% usaram apoio em áudio</AppText>
            </View>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir todas as missões"
          onPress={() => router.push('/monitor/missions')}
          style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}
        >
          <AppText variant="small" weight="800" color={colors.primary}>Acompanhar missões</AppText>
          <Ionicons name="arrow-forward" size={20} color={colors.primary} />
        </Pressable>
      </Card>

      <View style={styles.audioSummary}>
        <View style={styles.audioIcon}>
          <Ionicons name="volume-high" size={26} color={colors.blue} />
        </View>
        <View style={styles.audioCopy}>
          <AppText weight="800">Resumo por áudio</AppText>
          <AppText variant="small" color={colors.textMuted}>Ouça os principais destaques da turma.</AppText>
        </View>
        <AudioButton compact label="Ouvir resumo da turma" message="Reproduzindo resumo da turma…" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcome: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  welcomeCopy: { flex: 1, gap: spacing.xs },
  notification: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  metricGrid: { flexDirection: 'row', gap: spacing.md },
  pressed: { opacity: 0.7 },
  attentionCard: { gap: spacing.md },
  personRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  personCopy: { flex: 1, gap: 2 },
  progressCopy: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  missionSummary: { gap: spacing.md },
  missionRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs },
  divider: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: spacing.lg },
  missionIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  missionCopy: { flex: 1, gap: spacing.sm },
  missionTitle: { flex: 1 },
  inlineButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  audioSummary: {
    alignItems: 'center',
    backgroundColor: colors.blueSoft,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  audioIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.round,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  audioCopy: { flex: 1, gap: 2 },
});
