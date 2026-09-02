import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdminNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, MetricCard, ProgressBar, SectionTitle, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useAdminClass, useAdminParticipant, useAdminParticipantHistory } from '@/hooks/useClassData';
import type { ClassParticipant, AdminParticipantHistory } from '@/lib/backend';
import { colors, radius, spacing } from '@/theme/tokens';

type DetailTab = 'summary' | 'performance' | 'resources' | 'history';
type DetailPeriod = 7 | 30 | 90;

const tabs: readonly { key: DetailTab; label: string }[] = [
  { key: 'summary', label: 'Resumo' },
  { key: 'performance', label: 'Desempenho' },
  { key: 'resources', label: 'Recursos' },
  { key: 'history', label: 'Histórico' },
];

export default function ParticipantDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');
  const [period, setPeriod] = useState<DetailPeriod>(30);
  const classQuery = useAdminClass();
  const participantQuery = useAdminParticipant(classQuery.data?.class_id ?? null, id ?? null, period);
  const historyQuery = useAdminParticipantHistory(classQuery.data?.class_id ?? null, id ?? null, period);

  if (classQuery.loading || participantQuery.loading) {
    return (
      <Screen footer={<AdminNav active="participants" />}>
        <Header title="Detalhes" onBack={() => router.replace('/admin/participants')} />
        <DataState kind="loading" title="Carregando participante" message="Consultando o vínculo e o progresso permitido." />
      </Screen>
    );
  }

  if (classQuery.error || participantQuery.error) {
    return (
      <Screen footer={<AdminNav active="participants" />}>
        <Header title="Detalhes" onBack={() => router.replace('/admin/participants')} />
        <DataState kind="error" title="Não foi possível carregar" message="O acesso pode ter mudado ou a conexão está indisponível." onRetry={classQuery.error ? classQuery.retry : participantQuery.retry} />
      </Screen>
    );
  }

  if (!classQuery.data || !participantQuery.data) {
    return (
      <Screen footer={<AdminNav active="participants" />}>
        <Header title="Aluno não encontrado" onBack={() => router.replace('/admin/participants')} />
        <Card style={styles.notFoundCard}>
          <Ionicons name="person-remove-outline" size={42} color={colors.primary} />
          <AppText variant="subheading" weight="800" style={styles.center}>Não encontramos este cadastro</AppText>
          <AppText color={colors.textMuted} style={styles.center}>Volte à lista e escolha um participante disponível.</AppText>
          <Button label="Voltar aos alunos" onPress={() => router.replace('/admin/participants')} />
        </Card>
      </Screen>
    );
  }

  const participant = participantQuery.data;

  return (
    <Screen footer={<AdminNav active="participants" />}>
      <Header
        title="Detalhes"
        subtitle="Acompanhamento individual"
        onBack={() => router.replace('/admin/participants')}
        action={(
          <AudioButton
            compact
            label={`Ouvir resumo de ${participant.name}`}
            message={`Reproduzindo o resumo de ${participant.name}…`}
          />
        )}
      />

      <ParticipantHero className={classQuery.data.class_name} classShift={classQuery.data.class_shift} participant={participant} />

      <View accessibilityLabel="Período dos detalhes" style={styles.periods}>
        {([7, 30, 90] as const).map((item) => (
          <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: period === item }} onPress={() => setPeriod(item)} style={[styles.period, period === item && styles.periodSelected]}>
            <AppText variant="small" weight="800" color={period === item ? colors.surface : colors.textMuted}>{item} dias</AppText>
          </Pressable>
        ))}
      </View>
      <AppText variant="caption" color={colors.textMuted}>Última atualização: {formatDateTime(participantQuery.updatedAt)}</AppText>

      <ScrollView
        accessibilityLabel="Seções dos detalhes"
        contentContainerStyle={styles.tabs}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.pressed]}
            >
              {selected ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
              <AppText
                variant="small"
                weight={selected ? '800' : '600'}
                color={selected ? colors.primary : colors.textMuted}
              >
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {activeTab === 'summary' ? <SummaryTab participant={participant} /> : null}
      {activeTab === 'performance' ? <PerformanceTab participant={participant} /> : null}
      {activeTab === 'resources' ? <ResourcesTab participant={participant} /> : null}
      {activeTab === 'history' ? <HistoryTab participant={participant} history={historyQuery.data ?? []} loading={historyQuery.loading} error={historyQuery.error} retry={historyQuery.retry} /> : null}
    </Screen>
  );
}

function ParticipantHero({ className, classShift, participant }: { className: string; classShift: string | null; participant: ClassParticipant }) {
  const needsAttention = participant.attemptCount > 0 && participant.progress < 55;
  return (
    <Card style={styles.hero}>
      <View style={[styles.avatar, needsAttention && styles.avatarAttention]}>
        <AppText variant="subheading" weight="800" color={needsAttention ? '#8A6000' : colors.primary}>
          {participant.initials}
        </AppText>
      </View>
      <View style={styles.heroCopy}>
        <AppText variant="subheading" weight="800">{participant.name}</AppText>
        <AppText variant="small" color={colors.textMuted}>{className}{classShift ? ` • ${classShift}` : ''}</AppText>
        <Tag label={participant.attemptCount === 0 ? 'Sem atividade no período' : needsAttention ? 'Acompanhamento recomendado' : 'Avançando bem'} tone={needsAttention ? 'yellow' : participant.attemptCount === 0 ? 'gray' : 'green'} />
      </View>
    </Card>
  );
}

function SummaryTab({ participant }: { participant: ClassParticipant }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.metricGrid}>
        <MetricCard icon="trending-up-outline" value={`${participant.progress}%`} label="progresso geral" tone="green" />
        <MetricCard icon="star-outline" value={participant.score} label="média nas missões" tone="yellow" />
      </View>
      <View style={styles.metricGrid}>
        <MetricCard icon="volume-high-outline" value={`${participant.audio}%`} label="uso de áudio" tone="blue" />
        <MetricCard icon="hand-left-outline" value={`${participant.autonomy}%`} label="autonomia" tone="purple" />
      </View>

      <SectionTitle>Progresso da trilha</SectionTitle>
      <Card style={styles.progressCard}>
        <View style={styles.rowBetween}>
          <View>
            <AppText weight="800">{participant.completedMissions} de {participant.assignedMissions} missões</AppText>
            <AppText variant="small" color={colors.textMuted}>{participant.completedAttemptCount} tentativas concluídas no período</AppText>
          </View>
          <AppText variant="subheading" weight="800" color={colors.primary}>{participant.progress}%</AppText>
        </View>
        <ProgressBar value={participant.progress} color={participant.progress < 55 ? colors.warning : colors.success} height={12} />
      </Card>

      <SectionTitle>Ponto de atenção</SectionTitle>
      <Card style={styles.attentionCard}>
        <View style={styles.attentionIcon}>
          <Ionicons name="help-circle-outline" size={28} color="#8A6000" />
        </View>
        <View style={styles.flexCopy}>
          <AppText weight="800">{participant.difficultyTitle}</AppText>
          <AppText variant="small" color={colors.textMuted}>
            {participant.difficultyDescription}
          </AppText>
        </View>
      </Card>
    </View>
  );
}

function PerformanceTab({ participant }: { participant: ClassParticipant }) {
  const missionPerformance = [
    {
      name: 'Progresso das atribuições',
      value: participant.progress,
      support: `${participant.completedMissions} de ${participant.assignedMissions} missões concluídas`,
      tone: colors.success,
    },
    {
      name: 'Autonomia nas conclusões',
      value: participant.autonomy,
      support: 'Conclusões sem dica ou pedido de ajuda',
      tone: colors.warning,
    },
    {
      name: 'Uso de apoio em áudio',
      value: participant.audio,
      support: 'Tentativas com evento de áudio registrado',
      tone: colors.primary,
    },
  ] as const;

  return (
    <View style={styles.tabContent}>
      <SectionTitle>Indicadores agregados</SectionTitle>
      <Card style={styles.listCard}>
        {missionPerformance.map((mission, index) => (
          <View key={mission.name} style={[styles.missionItem, index > 0 && styles.divider]}>
            <View style={styles.rowBetween}>
              <AppText weight="800" style={styles.flexCopy}>{mission.name}</AppText>
              <AppText weight="800" color={mission.tone}>{mission.value}%</AppText>
            </View>
            <ProgressBar value={mission.value} color={mission.tone} height={9} />
            <AppText variant="small" color={colors.textMuted}>{mission.support}</AppText>
          </View>
        ))}
      </Card>

      <Card style={styles.insightCard}>
        <Ionicons name="sparkles-outline" size={26} color={colors.primary} />
        <View style={styles.flexCopy}>
          <AppText weight="800">Resumo dos registros disponíveis</AppText>
          <AppText variant="small" color={colors.textMuted}>
            {participant.name} concluiu {participant.completedMissions} das {participant.assignedMissions} missões atribuídas.
          </AppText>
        </View>
      </Card>
    </View>
  );
}

function ResourcesTab({ participant }: { participant: ClassParticipant }) {
  const { showNotice } = useApp();
  return (
    <View style={styles.tabContent}>
      <SectionTitle>Recursos de apoio usados</SectionTitle>
      <Card style={styles.listCard}>
        <ResourceRow icon="volume-high-outline" title="Instruções em áudio" value={`${participant.audio}% das atividades`} tone="blue" />
        <ResourceRow
          icon="hand-left-outline"
          title="Mostrar onde tocar"
          value={`${100 - participant.autonomy}% das conclusões precisaram de apoio`}
          tone="purple"
          divider
        />
        <ResourceRow
          icon="bulb-outline"
          title="Dicas passo a passo"
          value="Incluídas no indicador de autonomia"
          tone="yellow"
          divider
        />
      </Card>

      <Card style={styles.guidanceCard}>
        <View style={styles.guidanceHeading}>
          <View style={styles.guidanceIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={26} color={colors.primary} />
          </View>
          <View style={styles.flexCopy}>
            <AppText weight="800">Orientação sugerida</AppText>
            <AppText variant="small" color={colors.textMuted}>{participant.difficultyDescription}</AppText>
          </View>
        </View>
        <Button
          label="Marcar orientação como enviada"
          icon="checkmark-circle-outline"
          onPress={() => showNotice('Demonstração: nenhuma orientação foi enviada.')}
          variant="soft"
        />
      </Card>
    </View>
  );
}

function ResourceRow({ icon, title, value, tone, divider = false }: {
  icon: 'volume-high-outline' | 'hand-left-outline' | 'bulb-outline';
  title: string;
  value: string;
  tone: 'blue' | 'purple' | 'yellow';
  divider?: boolean;
}) {
  const toneStyle = resourceTones[tone];
  return (
    <View style={[styles.resourceRow, divider && styles.divider]}>
      <View style={[styles.resourceIcon, { backgroundColor: toneStyle.background }]}>
        <Ionicons name={icon} size={24} color={toneStyle.foreground} />
      </View>
      <View style={styles.flexCopy}>
        <AppText weight="800">{title}</AppText>
        <AppText variant="small" color={colors.textMuted}>{value}</AppText>
      </View>
    </View>
  );
}

function HistoryTab({ participant, history, loading, error, retry }: {
  participant: ClassParticipant;
  history: AdminParticipantHistory[];
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  if (loading) return <DataState kind="loading" title="Carregando histórico" message="Buscando as tentativas recentes." />;
  if (error) return <DataState kind="error" title="Não foi possível carregar o histórico" message="Tente novamente." onRetry={retry} />;
  if (!history.length) return <DataState kind="empty" title="Nenhuma atividade no período" message={`${participant.name} ainda não iniciou uma missão neste período.`} />;
  return (
    <View style={styles.tabContent}>
      <SectionTitle>Atividades recentes</SectionTitle>
      <Card style={styles.timeline}>
        {history.map((event, index) => (
          <View key={event.attempt_id} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View style={styles.timelineDot}><Ionicons name={event.attempt_status === 'completed' ? 'checkmark-circle-outline' : 'time-outline'} size={18} color={colors.primary} /></View>
              {index < history.length - 1 ? <View style={styles.timelineLine} /> : null}
            </View>
            <View style={styles.timelineCopy}>
              <AppText variant="caption" weight="700" color={colors.primary}>{formatDateTime(new Date(event.last_activity_at))}</AppText>
              <AppText weight="800">{event.mission_title}</AppText>
              <AppText variant="small" color={colors.textMuted}>{historyDescription(event)}</AppText>
            </View>
          </View>
        ))}
      </Card>
      <AppText variant="small" color={colors.textMuted} style={styles.center}>
        Histórico recente de {participant.name}
      </AppText>
    </View>
  );
}

function historyDescription(event: AdminParticipantHistory) {
  const support = [event.used_audio ? 'áudio' : null, event.used_hint ? 'dica' : null, event.requested_help ? 'ajuda' : null].filter(Boolean);
  const status = event.attempt_status === 'completed' ? 'Concluída' : event.attempt_status === 'abandoned' ? 'Interrompida' : 'Em andamento';
  return `${status}. ${event.error_count} ${event.error_count === 1 ? 'erro registrado' : 'erros registrados'}${support.length ? `; recursos usados: ${support.join(', ')}` : ''}.`;
}

function formatDateTime(value: Date | null) {
  return value ? value.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'aguardando dados';
}

const resourceTones = {
  blue: { background: colors.blueSoft, foreground: colors.blue },
  purple: { background: colors.primarySoft, foreground: colors.primary },
  yellow: { background: colors.warningSoft, foreground: '#8A6000' },
};

const styles = StyleSheet.create({
  notFoundCard: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  hero: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 68, justifyContent: 'center', width: 68 },
  avatarAttention: { backgroundColor: colors.warningSoft },
  heroCopy: { flex: 1, gap: spacing.xs },
  tabs: { gap: spacing.sm, paddingRight: spacing.lg },
  periods: { flexDirection: 'row', gap: spacing.sm },
  period: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.round, borderWidth: 1, flex: 1, minHeight: 42, justifyContent: 'center' },
  periodSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tab: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  tabSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  pressed: { opacity: 0.65 },
  tabContent: { gap: spacing.lg },
  metricGrid: { flexDirection: 'row', gap: spacing.md },
  progressCard: { gap: spacing.md },
  rowBetween: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  attentionCard: { alignItems: 'flex-start', backgroundColor: colors.warningSoft, borderColor: '#F1D38C', flexDirection: 'row', gap: spacing.md },
  attentionIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.round, height: 48, justifyContent: 'center', width: 48 },
  flexCopy: { flex: 1 },
  listCard: { gap: spacing.md },
  missionItem: { gap: spacing.sm },
  divider: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: spacing.md },
  insightCard: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, flexDirection: 'row', gap: spacing.md },
  resourceRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 62 },
  resourceIcon: { alignItems: 'center', borderRadius: radius.round, height: 46, justifyContent: 'center', width: 46 },
  guidanceCard: { gap: spacing.lg },
  guidanceHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  guidanceIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 50, justifyContent: 'center', width: 50 },
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', gap: spacing.md, minHeight: 102 },
  timelineRail: { alignItems: 'center', width: 38 },
  timelineDot: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 38, justifyContent: 'center', width: 38 },
  timelineLine: { backgroundColor: colors.primaryMuted, flex: 1, width: 2 },
  timelineCopy: { flex: 1, gap: 2, paddingBottom: spacing.lg },
  center: { textAlign: 'center' },
});
