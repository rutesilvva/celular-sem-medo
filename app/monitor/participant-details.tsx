import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MonitorNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, MetricCard, ProgressBar, SectionTitle, Tag } from '@/components/ui';
import { MissionState, useApp } from '@/context/AppContext';
import { participants } from '@/data/mock';
import { colors, radius, spacing } from '@/theme/tokens';

type DetailTab = 'summary' | 'performance' | 'resources' | 'history';
type Participant = (typeof participants)[number];

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
  const { mission, participantProgress } = useApp();
  const matchedParticipant = participants.find((item) => item.id === id);

  if (!matchedParticipant) {
    return (
      <Screen footer={<MonitorNav active="participants" />}>
        <Header title="Participante não encontrado" onBack={() => router.replace('/monitor/participants')} />
        <Card style={styles.notFoundCard}>
          <Ionicons name="person-remove-outline" size={42} color={colors.primary} />
          <AppText variant="subheading" weight="800" style={styles.center}>Não encontramos este cadastro</AppText>
          <AppText color={colors.textMuted} style={styles.center}>Volte à lista e escolha um participante disponível.</AppText>
          <Button label="Voltar aos participantes" onPress={() => router.replace('/monitor/participants')} />
        </Card>
      </Screen>
    );
  }

  const participant = matchedParticipant.id === 'maria'
    ? {
      ...matchedParticipant,
      progress: participantProgress,
      completedMissions: mission.completed ? 4 : matchedParticipant.completedMissions,
    }
    : matchedParticipant;

  return (
    <Screen footer={<MonitorNav active="participants" />}>
      <Header
        title="Detalhes"
        subtitle="Acompanhamento individual"
        onBack={() => router.replace('/monitor/participants')}
        action={(
          <AudioButton
            compact
            label={`Ouvir resumo de ${participant.name}`}
            message={`Reproduzindo o resumo de ${participant.name}…`}
          />
        )}
      />

      <ParticipantHero participant={participant} />

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
      {activeTab === 'performance' ? <PerformanceTab mission={mission} participant={participant} /> : null}
      {activeTab === 'resources' ? <ResourcesTab participant={participant} /> : null}
      {activeTab === 'history' ? <HistoryTab mission={mission} participant={participant} /> : null}
    </Screen>
  );
}

function ParticipantHero({ participant }: { participant: Participant }) {
  const needsAttention = participant.progress < 55;
  return (
    <Card style={styles.hero}>
      <View style={[styles.avatar, needsAttention && styles.avatarAttention]}>
        <AppText variant="subheading" weight="800" color={needsAttention ? '#8A6000' : colors.primary}>
          {participant.initials}
        </AppText>
      </View>
      <View style={styles.heroCopy}>
        <AppText variant="subheading" weight="800">{participant.name}</AppText>
        <AppText variant="small" color={colors.textMuted}>Turma Conectados • manhã</AppText>
        <Tag label={needsAttention ? 'Acompanhamento recomendado' : 'Avançando bem'} tone={needsAttention ? 'yellow' : 'green'} />
      </View>
    </Card>
  );
}

function SummaryTab({ participant }: { participant: Participant }) {
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
            <AppText weight="800">{participant.completedMissions} de 6 missões</AppText>
            <AppText variant="small" color={colors.textMuted}>
              {Math.max(1, participant.completedMissions - 2)} concluídas sem ajuda
            </AppText>
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

function PerformanceTab({ participant, mission }: { participant: Participant; mission: MissionState }) {
  const photoValue = participant.id === 'maria' && !mission.completed
    ? 0
    : Math.min(96, participant.progress + 16);
  const photoSupport = participant.id !== 'maria'
    ? 'Concluída sem ajuda'
    : !mission.completed
      ? 'Ainda não concluída nesta sessão'
      : mission.usedHelp
        ? 'Concluída após prática guiada'
        : 'Concluída com autonomia';
  const missionPerformance = [
    {
      name: 'Enviar uma foto',
      value: photoValue,
      support: photoSupport,
      tone: colors.success,
    },
    {
      name: 'Conferir um Pix',
      value: Math.max(28, participant.progress - 16),
      support: participant.id === 'ana' ? 'Precisou de 3 orientações' : 'Precisou de 1 orientação',
      tone: colors.warning,
    },
    {
      name: 'Compartilhar localização',
      value: Math.max(18, participant.progress - 29),
      support: participant.id === 'jose' ? 'Prática recomendada' : 'Em andamento',
      tone: colors.primary,
    },
  ] as const;

  return (
    <View style={styles.tabContent}>
      <SectionTitle>Desempenho por missão</SectionTitle>
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
          <AppText weight="800">Evolução nas últimas 4 semanas</AppText>
          <AppText variant="small" color={colors.textMuted}>
            {participant.name} ganhou 18 pontos de autonomia e pede menos ajuda após ouvir instruções.
          </AppText>
        </View>
      </Card>
    </View>
  );
}

function ResourcesTab({ participant }: { participant: Participant }) {
  const { showNotice } = useApp();
  return (
    <View style={styles.tabContent}>
      <SectionTitle>Recursos de apoio usados</SectionTitle>
      <Card style={styles.listCard}>
        <ResourceRow icon="volume-high-outline" title="Instruções em áudio" value={`${participant.audio}% das atividades`} tone="blue" />
        <ResourceRow
          icon="hand-left-outline"
          title="Mostrar onde tocar"
          value={`${participant.progress < 55 ? 5 : 2} vezes nesta semana`}
          tone="purple"
          divider
        />
        <ResourceRow
          icon="bulb-outline"
          title="Dicas passo a passo"
          value={`${participant.audio > 80 ? 3 : 1} vezes nesta semana`}
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
            <AppText variant="small" color={colors.textMuted}>Reforce a etapa de conferência antes de confirmar.</AppText>
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

function HistoryTab({ participant, mission }: { participant: Participant; mission: MissionState }) {
  const photoEvent = participant.id === 'maria'
    ? mission.completed
      ? {
        date: 'Agora',
        title: 'Concluiu “Enviar uma foto”',
        detail: `${mission.usedHelp ? 'Concluiu após receber apoio' : 'Concluiu com autonomia'} ${attemptText(mission.attempts)}.`,
        icon: 'checkmark-circle-outline' as const,
      }
      : {
        date: 'Próxima prática',
        title: '“Enviar uma foto” disponível',
        detail: 'Missão ainda não concluída nesta sessão.',
        icon: 'image-outline' as const,
      }
    : {
      date: 'Ontem, 15:15',
      title: 'Concluiu “Enviar uma foto”',
      detail: participant.id === 'jose'
        ? 'Concluiu com autonomia na primeira tentativa.'
        : 'Concluiu após ouvir novamente a instrução.',
      icon: 'checkmark-circle-outline' as const,
    };
  const events = [
    photoEvent,
    { date: 'Hoje, 09:40', title: 'Praticou “Conferir um Pix”', detail: 'Usou áudio e pediu para mostrar onde tocar.', icon: 'shield-checkmark-outline' as const },
    { date: '18 ago, 10:30', title: 'Atualizou acessibilidade', detail: 'Ativou instruções automáticas em áudio.', icon: 'options-outline' as const },
  ];
  return (
    <View style={styles.tabContent}>
      <SectionTitle>Atividades recentes</SectionTitle>
      <Card style={styles.timeline}>
        {events.map((event, index) => (
          <View key={event.date} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View style={styles.timelineDot}><Ionicons name={event.icon} size={18} color={colors.primary} /></View>
              {index < events.length - 1 ? <View style={styles.timelineLine} /> : null}
            </View>
            <View style={styles.timelineCopy}>
              <AppText variant="caption" weight="700" color={colors.primary}>{event.date}</AppText>
              <AppText weight="800">{event.title}</AppText>
              <AppText variant="small" color={colors.textMuted}>{event.detail}</AppText>
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

function attemptText(attempts: number) {
  return attempts <= 1 ? 'na primeira tentativa' : `em ${attempts} tentativas`;
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
