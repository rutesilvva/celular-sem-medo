import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MonitorNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, MetricCard, ProgressBar, SectionTitle, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useMyClass } from '@/hooks/useClassData';
import { monitorMissions } from '@/data/mock';
import { colors, radius, spacing } from '@/theme/tokens';

type ReportPeriod = 7 | 30 | 90;

const periods: readonly ReportPeriod[] = [7, 30, 90];
const reportData: Record<ReportPeriod, {
  completed: string;
  progress: string;
  autonomy: string;
  audio: string;
  trend: string;
}> = {
  7: { completed: '18', progress: '+8%', autonomy: '68%', audio: '73%', trend: '8 pontos acima da semana anterior' },
  30: { completed: '62', progress: '+19%', autonomy: '64%', audio: '76%', trend: '19 pontos acima do mês anterior' },
  90: { completed: '148', progress: '+34%', autonomy: '59%', audio: '71%', trend: '34 pontos desde o início da turma' },
};

const timelineData: Record<ReportPeriod, readonly { label: string; value: number }[]> = {
  7: [
    { label: 'Seg', value: 1 },
    { label: 'Ter', value: 2 },
    { label: 'Qua', value: 3 },
    { label: 'Qui', value: 2 },
    { label: 'Sex', value: 4 },
    { label: 'Sáb', value: 3 },
    { label: 'Dom', value: 3 },
  ],
  30: [
    { label: 'Sem 1', value: 12 },
    { label: 'Sem 2', value: 14 },
    { label: 'Sem 3', value: 16 },
    { label: 'Sem 4', value: 20 },
  ],
  90: [
    { label: 'Jun', value: 41 },
    { label: 'Jul', value: 47 },
    { label: 'Ago', value: 60 },
  ],
};

export default function ReportsScreen() {
  const [period, setPeriod] = useState<ReportPeriod>(30);
  const { showNotice } = useApp();
  const classQuery = useMyClass('monitor');
  const data = reportData[period];

  return (
    <Screen footer={<MonitorNav active="reports" />}>
      <Header
        title="Relatórios"
        subtitle={classQuery.data ? `Evolução de ${classQuery.data.class_name}` : 'Evolução da turma'}
        action={<AudioButton compact label="Ouvir resumo do relatório" message={`Reproduzindo relatório dos últimos ${period} dias…`} />}
      />

      <View style={styles.periodBlock}>
        <AppText variant="small" weight="800" color={colors.primary}>Período do relatório</AppText>
        <View accessibilityLabel="Selecionar período" style={styles.periods}>
          {periods.map((item) => {
            const selected = period === item;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Últimos ${item} dias`}
                accessibilityState={{ selected }}
                key={item}
                onPress={() => setPeriod(item)}
                style={({ pressed }) => [styles.periodButton, selected && styles.periodSelected, pressed && styles.pressed]}
              >
                {selected ? <Ionicons name="checkmark" size={17} color={colors.surface} /> : null}
                <AppText
                  variant="small"
                  weight="800"
                  color={selected ? colors.surface : colors.textMuted}
                >
                  {item} dias
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.metricGrid}>
        <MetricCard icon="checkmark-done-outline" value={data.completed} label="missões concluídas" tone="green" />
        <MetricCard icon="trending-up-outline" value={data.progress} label="evolução no período" tone="purple" />
      </View>
      <View style={styles.metricGrid}>
        <MetricCard icon="hand-left-outline" value={data.autonomy} label="índice de autonomia" tone="yellow" />
        <MetricCard icon="volume-high-outline" value={data.audio} label="uso de áudio" tone="blue" />
      </View>

      <Card style={styles.insight}>
        <View style={styles.insightIcon}>
          <Ionicons name="trending-up-outline" size={27} color={colors.success} />
        </View>
        <View style={styles.flexCopy}>
          <AppText weight="800">A turma está evoluindo</AppText>
          <AppText variant="small" color={colors.textMuted}>O progresso está {data.trend}.</AppText>
        </View>
        <Tag label="Tendência positiva" tone="green" />
      </Card>

      <SectionTitle>Evolução das missões concluídas</SectionTitle>
      <TimelineChart period={period} />

      <SectionTitle>Conclusão por missão</SectionTitle>
      <Card style={styles.chartCard}>
        <AppText variant="small" color={colors.textMuted}>
          Percentual de participantes que concluíram cada atividade.
        </AppText>
        {monitorMissions.map((mission) => (
          <View
            accessibilityLabel={`${mission.title}: ${mission.completion}% de conclusão`}
            key={mission.title}
            style={styles.barRow}
          >
            <View style={styles.barHeading}>
              <AppText variant="small" weight="700" style={styles.flexCopy}>{mission.title}</AppText>
              <AppText variant="small" weight="800" color={colors.primary}>{mission.completion}%</AppText>
            </View>
            <ProgressBar value={mission.completion} color={mission.completion >= 70 ? colors.success : colors.primary} height={12} />
          </View>
        ))}
      </Card>

      <SectionTitle>Onde a turma mais pede ajuda</SectionTitle>
      <Card style={styles.difficultyCard}>
        <DifficultyRow label="Confirmar uma ação" value={48} icon="checkmark-circle-outline" />
        <DifficultyRow label="Encontrar o botão correto" value={37} icon="hand-left-outline" divider />
        <DifficultyRow label="Revisar antes de enviar" value={22} icon="eye-outline" divider />
      </Card>

      <SectionTitle>Uso dos recursos de apoio</SectionTitle>
      <Card style={styles.supportCard}>
        <SupportColumn icon="volume-high-outline" value={73} label="Áudio" color={colors.blue} background={colors.blueSoft} />
        <SupportColumn icon="hand-left-outline" value={42} label="Onde tocar" color={colors.primary} background={colors.primarySoft} />
        <SupportColumn icon="bulb-outline" value={31} label="Dicas" color="#8A6000" background={colors.warningSoft} />
      </Card>

      <Card style={styles.exportCard}>
        <View style={styles.exportHeading}>
          <View style={styles.exportIcon}>
            <Ionicons name="document-text-outline" size={27} color={colors.primary} />
          </View>
          <View style={styles.flexCopy}>
            <AppText weight="800">Relatório da turma</AppText>
            <AppText variant="small" color={colors.textMuted}>Resumo dos últimos {period} dias, pronto para compartilhar.</AppText>
          </View>
        </View>
        <Button
          label="Preparar relatório para exportação"
          icon="download-outline"
          onPress={() => showNotice('Relatório pronto para exportação.')}
        />
      </Card>
    </Screen>
  );
}

function TimelineChart({ period }: { period: ReportPeriod }) {
  const series = timelineData[period];
  const maximum = Math.max(...series.map((item) => item.value));
  const total = series.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card style={styles.timelineCard}>
      <View style={styles.timelineHeading}>
        <View style={styles.flexCopy}>
          <AppText weight="800">Últimos {period} dias</AppText>
          <AppText variant="small" color={colors.textMuted}>
            Quantidade concluída em cada intervalo.
          </AppText>
        </View>
        <View accessibilityLabel={`${total} missões concluídas no período`} style={styles.timelineTotal}>
          <AppText variant="subheading" weight="800" color={colors.primary}>{total}</AppText>
          <AppText variant="caption" color={colors.textMuted}>no total</AppText>
        </View>
      </View>

      <View
        accessibilityLabel={`Gráfico de evolução das missões concluídas nos últimos ${period} dias`}
        style={styles.timelinePlot}
      >
        <View importantForAccessibility="no-hide-descendants" style={styles.gridLines}>
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
        </View>
        <View style={styles.barColumns}>
          {series.map((item, index) => {
            const barHeight = 22 + (item.value / maximum) * 92;
            const isLatest = index === series.length - 1;
            return (
              <View
                accessible
                accessibilityLabel={`${item.label}: ${item.value} ${item.value === 1 ? 'missão concluída' : 'missões concluídas'}`}
                key={item.label}
                style={styles.timelineColumn}
              >
                <View style={styles.barValueArea}>
                  <AppText variant="caption" weight="800" color={isLatest ? colors.success : colors.primary}>
                    {item.value}
                  </AppText>
                  <View
                    style={[
                      styles.timelineBar,
                      { height: barHeight },
                      isLatest && styles.timelineBarLatest,
                    ]}
                  />
                </View>
                <AppText variant="caption" weight="700" color={colors.textMuted} style={styles.center}>
                  {item.label}
                </AppText>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.timelineLegend}>
        <View style={styles.legendDot} />
        <AppText variant="caption" color={colors.textMuted}>
          A barra verde destaca o intervalo mais recente.
        </AppText>
      </View>
    </Card>
  );
}

function DifficultyRow({ label, value, icon, divider = false }: {
  label: string;
  value: number;
  icon: 'checkmark-circle-outline' | 'hand-left-outline' | 'eye-outline';
  divider?: boolean;
}) {
  return (
    <View accessibilityLabel={`${label}: ${value}%`} style={[styles.difficultyRow, divider && styles.divider]}>
      <View style={styles.difficultyIcon}>
        <Ionicons name={icon} size={22} color="#8A6000" />
      </View>
      <View style={styles.flexCopy}>
        <View style={styles.barHeading}>
          <AppText variant="small" weight="700" style={styles.flexCopy}>{label}</AppText>
          <AppText variant="small" weight="800" color="#8A6000">{value}%</AppText>
        </View>
        <ProgressBar value={value} color={colors.warning} height={8} />
      </View>
    </View>
  );
}

function SupportColumn({ icon, value, label, color, background }: {
  icon: 'volume-high-outline' | 'hand-left-outline' | 'bulb-outline';
  value: number;
  label: string;
  color: string;
  background: string;
}) {
  return (
    <View accessibilityLabel={`${label}: ${value}%`} style={styles.supportColumn}>
      <View style={[styles.supportIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <AppText variant="subheading" weight="800" color={color}>{value}%</AppText>
      <AppText variant="caption" weight="700" color={colors.textMuted} style={styles.center}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  periodBlock: { gap: spacing.sm },
  periods: { flexDirection: 'row', gap: spacing.sm },
  periodButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.sm,
  },
  periodSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.65 },
  metricGrid: { flexDirection: 'row', gap: spacing.md },
  insight: { alignItems: 'center', backgroundColor: colors.successSoft, borderColor: '#BEE8CE', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  insightIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.round, height: 50, justifyContent: 'center', width: 50 },
  flexCopy: { flex: 1 },
  timelineCard: { gap: spacing.lg, overflow: 'hidden' },
  timelineHeading: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  timelineTotal: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    minWidth: 78,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  timelinePlot: { minHeight: 164, position: 'relative' },
  gridLines: {
    bottom: 29,
    justifyContent: 'space-between',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 18,
  },
  gridLine: { borderTopColor: colors.border, borderTopWidth: 1 },
  barColumns: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.xs, minHeight: 164 },
  timelineColumn: { alignItems: 'stretch', flex: 1, gap: spacing.xs, minWidth: 24 },
  barValueArea: { alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  timelineBar: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    maxWidth: 44,
    minWidth: 18,
    width: '72%',
  },
  timelineBarLatest: { backgroundColor: colors.success },
  timelineLegend: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  legendDot: { backgroundColor: colors.success, borderRadius: radius.round, height: 10, width: 10 },
  chartCard: { gap: spacing.lg },
  barRow: { gap: spacing.sm },
  barHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  difficultyCard: { gap: spacing.md },
  difficultyRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  difficultyIcon: { alignItems: 'center', backgroundColor: colors.warningSoft, borderRadius: radius.round, height: 44, justifyContent: 'center', width: 44 },
  divider: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: spacing.md },
  supportCard: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-around' },
  supportColumn: { alignItems: 'center', flex: 1, gap: spacing.xs },
  supportIcon: { alignItems: 'center', borderRadius: radius.round, height: 48, justifyContent: 'center', width: 48 },
  center: { textAlign: 'center' },
  exportCard: { gap: spacing.lg },
  exportHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  exportIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 52, justifyContent: 'center', width: 52 },
});
