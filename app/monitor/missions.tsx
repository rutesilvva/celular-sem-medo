import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MonitorNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, MetricCard, ProgressBar, SectionTitle, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useMyClass } from '@/hooks/useClassData';
import { useMonitorProgress } from '@/hooks/useProgressData';
import { colors, radius, spacing } from '@/theme/tokens';

type MissionFilter = 'all' | 'active' | 'planned';
type MonitorMission = { id: string; title: string; completion: number; difficulty: number; audio: number; status: 'Ativa' };

const filters: readonly { key: MissionFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Ativas' },
  { key: 'planned', label: 'Planejadas' },
];

const missionIcons = {
  'Enviar uma foto': 'image-outline',
  'Conferir um Pix': 'shield-checkmark-outline',
  'Compartilhar localização': 'location-outline',
} as const;

export default function MonitorMissionsScreen() {
  const [filter, setFilter] = useState<MissionFilter>('all');
  const { showNotice } = useApp();
  const classQuery = useMyClass('monitor');
  const progressQuery = useMonitorProgress(classQuery.data?.class_id ?? null, 30);
  const missions: MonitorMission[] = progressQuery.missions.data.map((mission) => ({ id: mission.assignment_id, title: mission.title, completion: mission.completion_percent, difficulty: mission.difficulty_percent, audio: mission.audio_usage_percent, status: 'Ativa' }));
  const visibleMissions = filter === 'planned' ? [] : missions;

  const averageCompletion = Math.round(
    missions.reduce((total, mission) => total + mission.completion, 0) / Math.max(1, missions.length),
  );

  if (classQuery.loading || progressQuery.missions.loading) {
    return <Screen footer={<MonitorNav active="missions" />}><Header title="Missões" /><DataState kind="loading" title="Carregando missões" message="Calculando os dados reais da turma." /></Screen>;
  }
  if (classQuery.error || progressQuery.missions.error) {
    return <Screen footer={<MonitorNav active="missions" />}><Header title="Missões" /><DataState kind="error" title="Não foi possível carregar" message="Verifique a conexão e tente novamente." onRetry={classQuery.error ? classQuery.retry : progressQuery.missions.retry} /></Screen>;
  }
  if (!classQuery.data) {
    return <Screen footer={<MonitorNav active="missions" />}><Header title="Missões" /><DataState kind="empty" title="Nenhuma turma vinculada" message="Você não possui uma turma ativa para consultar." /></Screen>;
  }

  return (
    <Screen footer={<MonitorNav active="missions" />}>
      <Header title="Missões" subtitle="Acompanhe a prática da turma" audio />
      <AppText variant="caption" color={colors.textMuted}>Última atualização: {formatUpdatedAt(progressQuery.missions.updatedAt)}</AppText>

      <View style={styles.metrics}>
        <MetricCard icon="flag-outline" value={`${missions.length}`} label="missões ativas" tone="purple" />
        <MetricCard icon="trending-up-outline" value={`${averageCompletion}%`} label="conclusão média" tone="green" />
      </View>

      <Card style={styles.highlight}>
        <View style={styles.highlightIcon}>
          <Ionicons name="sparkles-outline" size={27} color={colors.primary} />
        </View>
        <View style={styles.highlightCopy}>
          <AppText weight="800">Destaque da semana</AppText>
          <AppText variant="small" color={colors.textMuted}>
            {missions.length ? `“${[...missions].sort((a, b) => b.completion - a.completion)[0]?.title}” possui a maior conclusão no período.` : 'A turma ainda não possui atividade no período.'}
          </AppText>
        </View>
      </Card>

      <View accessibilityLabel="Filtrar missões" style={styles.filters}>
        {filters.map((item) => {
          const selected = filter === item.key;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mostrar missões ${item.label.toLocaleLowerCase('pt-BR')}`}
              accessibilityState={{ selected }}
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={({ pressed }) => [styles.filter, selected && styles.filterSelected, pressed && styles.pressed]}
            >
              {selected ? <Ionicons name="checkmark" size={17} color={colors.surface} /> : null}
              <AppText
                variant="small"
                weight={selected ? '800' : '600'}
                color={selected ? colors.surface : colors.textMuted}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>{visibleMissions.length === 1 ? '1 missão' : `${visibleMissions.length} missões`}</SectionTitle>
      <View style={styles.missionList}>
        {visibleMissions.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            onOpen={() => showNotice(`Análise de “${mission.title}” selecionada.`)}
          />
        ))}
      </View>
      {!visibleMissions.length ? <DataState kind="empty" title="Nenhuma missão neste filtro" message="A turma não possui missões correspondentes no período." /> : null}

      <Card style={styles.legend}>
        <View style={styles.legendHeading}>
          <Ionicons name="information-circle-outline" size={23} color={colors.blue} />
          <AppText weight="800">Como interpretar</AppText>
        </View>
        <LegendRow color={colors.success} label="Conclusão" description="Participantes que concluíram a missão" />
        <LegendRow color={colors.warning} label="Dificuldade" description="Participantes que solicitaram ajuda" />
        <LegendRow color={colors.blue} label="Áudio" description="Participantes que ouviram instruções" />
      </Card>
    </Screen>
  );
}

function formatUpdatedAt(value: Date | null) {
  return value ? value.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'aguardando dados';
}

function MissionCard({ mission, onOpen }: { mission: MonitorMission; onOpen: () => void }) {
  const icon = missionIcons[mission.title as keyof typeof missionIcons] ?? 'flag-outline';
  const completionTone = mission.completion >= 70 ? colors.success : colors.primary;
  return (
    <Card style={styles.missionCard}>
      <View style={styles.missionHeading}>
        <View style={styles.missionIcon}>
          <Ionicons name={icon} size={28} color={colors.primary} />
        </View>
        <View style={styles.missionCopy}>
          <AppText variant="subheading" weight="800">{mission.title}</AppText>
          <Tag label={mission.status} tone="green" />
        </View>
      </View>

      <MissionMetric
        icon="checkmark-circle-outline"
        label="Conclusão da turma"
        value={mission.completion}
        color={completionTone}
      />
      <MissionMetric
        icon="help-circle-outline"
        label="Encontraram dificuldade"
        value={mission.difficulty}
        color={colors.warning}
      />
      <MissionMetric
        icon="volume-high-outline"
        label="Usaram apoio em áudio"
        value={mission.audio}
        color={colors.blue}
      />

      <Button
        label="Ver análise da missão"
        icon="analytics-outline"
        onPress={onOpen}
        variant="soft"
      />
    </Card>
  );
}

function MissionMetric({ icon, label, value, color }: {
  icon: 'checkmark-circle-outline' | 'help-circle-outline' | 'volume-high-outline';
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View
      accessibilityLabel={`${label}: ${value}%`}
      style={styles.missionMetric}
    >
      <View style={styles.metricCopy}>
        <View style={styles.metricLabel}>
          <Ionicons name={icon} size={20} color={color} />
          <AppText variant="small" weight="700" style={styles.flexCopy}>{label}</AppText>
        </View>
        <AppText variant="small" weight="800" color={color}>{value}%</AppText>
      </View>
      <ProgressBar value={value} color={color} height={9} />
    </View>
  );
}

function LegendRow({ color, label, description }: { color: string; label: string; description: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View style={styles.flexCopy}>
        <AppText variant="small" weight="800">{label}</AppText>
        <AppText variant="caption" color={colors.textMuted}>{description}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', gap: spacing.md },
  highlight: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, flexDirection: 'row', gap: spacing.md },
  highlightIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.round, height: 50, justifyContent: 'center', width: 50 },
  highlightCopy: { flex: 1, gap: 2 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filter: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.65 },
  missionList: { gap: spacing.lg },
  missionCard: { gap: spacing.lg },
  missionHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  missionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 58, justifyContent: 'center', width: 58 },
  missionCopy: { flex: 1, gap: spacing.sm },
  missionMetric: { gap: spacing.sm },
  metricCopy: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  metricLabel: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.sm },
  flexCopy: { flex: 1 },
  legend: { gap: spacing.md },
  legendHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  legendRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  legendDot: { borderRadius: radius.round, height: 12, width: 12 },
});
