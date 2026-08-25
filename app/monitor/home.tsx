import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { MonitorNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Card, Header, MetricCard, ProgressBar, SectionTitle, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useMyClass, useMonitorParticipants } from '@/hooks/useClassData';
import { useMonitorProgress } from '@/hooks/useProgressData';
import { colors, radius, spacing } from '@/theme/tokens';

export default function MonitorHomeScreen() {
  const router = useRouter();
  const { showNotice } = useApp();
  const { currentUser } = useAuth();
  const firstName = currentUser?.name.split(/\s+/)[0] || 'Monitor';
  const classQuery = useMyClass('monitor');
  const participantsQuery = useMonitorParticipants(classQuery.data?.class_id ?? null, { limit: 5, sort: 'progress_asc' });
  const progressQuery = useMonitorProgress(classQuery.data?.class_id ?? null, 30);
  const currentParticipants = participantsQuery.data?.items ?? [];

  if (classQuery.loading || (classQuery.data && (participantsQuery.loading || progressQuery.summary.loading || progressQuery.missions.loading))) {
    return <Screen footer={<MonitorNav active="home" />}><Header title="Visão geral" /><DataState kind="loading" title="Carregando turma" message="Buscando participantes e indicadores." /></Screen>;
  }
  if (classQuery.error || participantsQuery.error || progressQuery.summary.error || progressQuery.missions.error) {
    return <Screen footer={<MonitorNav active="home" />}><Header title="Visão geral" /><DataState kind="error" title="Não foi possível carregar" message="Verifique sua conexão e tente novamente." onRetry={() => { classQuery.retry(); participantsQuery.retry(); progressQuery.summary.retry(); progressQuery.missions.retry(); }} /></Screen>;
  }
  if (!classQuery.data) {
    return <Screen footer={<MonitorNav active="home" />}><Header title="Visão geral" /><DataState kind="empty" title="Nenhuma turma vinculada" message="Peça à administração para cadastrar seu vínculo de monitor." /></Screen>;
  }
  const summary = progressQuery.summary.data;
  const attentionParticipant = currentParticipants.find((participant) => participant.attemptCount > 0 && participant.progress < 55);
  const updatedAt = progressQuery.summary.updatedAt ?? participantsQuery.updatedAt;

  return (
    <Screen footer={<MonitorNav active="home" />}>
      <Header
        title="Visão geral"
        subtitle={`${classQuery.data.class_name}${classQuery.data.class_shift ? ` • ${classQuery.data.class_shift}` : ''}`}
        audio
        action={undefined}
      />

      <View style={styles.welcome}>
        <View style={styles.welcomeCopy}>
          <AppText variant="heading" weight="800">Olá, {firstName}!</AppText>
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
        <MetricCard icon="people-outline" value={`${summary?.participant_count ?? participantsQuery.data?.total ?? 0}`} label="participantes vinculados" tone="purple" />
        <MetricCard icon="trending-up-outline" value={`${summary?.completion_percent ?? 0}%`} label="conclusão da turma" tone="green" />
      </View>
      <View style={styles.metricGrid}>
        <MetricCard icon="volume-high-outline" value={`${summary?.audio_usage_percent ?? 0}%`} label="usaram apoio em áudio" tone="blue" />
        <MetricCard icon="flag-outline" value={`${summary?.assigned_missions ?? 0}`} label="missões em andamento" tone="yellow" />
      </View>

      <AppText variant="caption" color={colors.textMuted}>Última atualização: {formatUpdatedAt(updatedAt)}</AppText>

      {summary && summary.active_participants === 0 ? (
        <DataState kind="empty" title="Turma sem atividade no período" message="Ainda não há tentativas registradas nos últimos 30 dias." />
      ) : null}

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
                <AppText variant="small" color={colors.textMuted}>{attentionParticipant.difficultyDescription}</AppText>
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
        {progressQuery.missions.data.slice(0, 2).map((mission, index) => (
          <View key={mission.assignment_id} style={[styles.missionRow, index > 0 && styles.divider]}>
            <View style={styles.missionIcon}>
              <Ionicons name={index === 0 ? 'image-outline' : 'shield-checkmark-outline'} size={24} color={colors.primary} />
            </View>
            <View style={styles.missionCopy}>
              <View style={styles.progressCopy}>
                <AppText variant="small" weight="800" style={styles.missionTitle}>{mission.title}</AppText>
                <AppText variant="small" weight="800" color={colors.primary}>{mission.completion_percent}%</AppText>
              </View>
              <ProgressBar value={mission.completion_percent} height={8} />
              <AppText variant="caption" color={colors.textMuted}>{mission.autonomy_percent}% concluíram com autonomia</AppText>
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

function formatUpdatedAt(value: Date | null) {
  return value ? value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'aguardando dados';
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
