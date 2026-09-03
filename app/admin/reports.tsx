import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AdminNav } from '@/components/BottomNav';
import { AdminClassSelector } from '@/components/AdminClassSelector';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, MetricCard, ProgressBar, SectionTitle, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useAdminClass } from '@/hooks/useClassData';
import { useAdminProgress } from '@/hooks/useProgressData';
import { deleteReportFiles, exportReportFiles, type ReportExportRow } from '@/lib/report-export';
import { captureUsageEvent } from '@/lib/observability';
import { colors, radius, spacing } from '@/theme/tokens';

type ReportPeriod = 7 | 30 | 90;

const periods: readonly ReportPeriod[] = [7, 30, 90];
export default function ReportsScreen() {
  const [period, setPeriod] = useState<ReportPeriod>(30);
  const { showNotice } = useApp();
  const classQuery = useAdminClass();
  const progress = useAdminProgress(classQuery.data?.class_id ?? null, period);
  const data = progress.summary.data;
  const loading = classQuery.loading || progress.summary.loading || progress.missions.loading || progress.evolution.loading;
  const failed = classQuery.error || progress.summary.error || progress.missions.error || progress.evolution.error;
  const hasActivity = (data?.active_participants ?? 0) > 0;
  const updatedAt = progress.summary.updatedAt;
  const handleExport = useCallback(async () => {
    if (!data || !classQuery.data) return;
    const rows: ReportExportRow[] = [
      { label: 'Turma', value: classQuery.data.class_name },
      { label: 'Alunos ativos', value: data.active_participants ?? 0 },
      { label: 'Missões concluídas', value: data.completed_missions ?? 0 },
      { label: 'Conclusão da turma', value: `${data.completion_percent ?? 0}%` },
      { label: 'Autonomia', value: `${data.autonomy_percent ?? 0}%` },
      { label: 'Uso de áudio', value: `${data.audio_usage_percent ?? 0}%` },
      { label: 'Período', value: `${period} dias` },
    ];

    try {
      const exported = await exportReportFiles(rows, `Relatório ${classQuery.data.class_name}`);
      captureUsageEvent('report_exported', { className: classQuery.data.class_name, completed: true, event: 'report_exported' });
      if (!await Sharing.isAvailableAsync()) {
        Alert.alert('Exportação pronta', 'Os arquivos foram gerados, mas o compartilhamento não está disponível neste dispositivo.');
        return;
      }
      Alert.alert('Escolha o formato', 'Qual arquivo você deseja compartilhar?', [
        { text: 'Cancelar', style: 'cancel', onPress: () => void deleteReportFiles([exported.csvPath, exported.pdfPath]) },
        { text: 'CSV', onPress: () => void shareAndClean(exported.csvPath, exported.pdfPath, 'text/csv') },
        { text: 'PDF', onPress: () => void shareAndClean(exported.pdfPath, exported.csvPath, 'application/pdf') },
      ]);
      showNotice('Relatório pronto para compartilhar');
    } catch (error) {
      captureUsageEvent('report_exported', { className: classQuery.data.class_name, completed: false, event: 'report_exported' });
      console.error(error);
      Alert.alert('Não foi possível exportar', 'Verifique a permissão para salvar arquivos no aparelho e tente novamente.');
    }
  }, [classQuery.data, data, period, showNotice]);

  return (
    <Screen footer={<AdminNav active="reports" />}>
      <Header
        title="Relatórios"
        subtitle={classQuery.data ? `Evolução de ${classQuery.data.class_name}` : 'Evolução da turma'}
        action={<AudioButton compact label="Ouvir resumo do relatório" message={`Reproduzindo relatório dos últimos ${period} dias…`} />}
      />
      <AdminClassSelector selectedId={classQuery.data?.class_id} />

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

      {loading ? <DataState kind="loading" title="Calculando relatório" message="Consolidando tentativas e eventos da turma." /> : failed ? (
        <DataState kind="error" title="Não foi possível calcular" message="Tente carregar os dados novamente." onRetry={() => { classQuery.retry(); progress.summary.retry(); progress.missions.retry(); progress.evolution.retry(); }} />
      ) : !classQuery.data ? (
        <DataState kind="empty" title="Nenhuma turma vinculada" message="Você não possui uma turma ativa para consultar." />
      ) : !hasActivity ? (
        <DataState kind="empty" title="Turma sem atividade no período" message={`Não existem tentativas registradas nos últimos ${period} dias. Nenhuma métrica foi estimada.`} />
      ) : <>
      <View style={styles.metricGrid}>
        <MetricCard icon="checkmark-done-outline" value={`${data?.completed_missions ?? 0}`} label="missões concluídas" tone="green" />
        <MetricCard icon="trending-up-outline" value={`${data?.completion_percent ?? 0}%`} label="conclusão da turma" tone="purple" />
      </View>
      <View style={styles.metricGrid}>
        <MetricCard icon="hand-left-outline" value={`${data?.autonomy_percent ?? 0}%`} label="índice de autonomia" tone="yellow" />
        <MetricCard icon="volume-high-outline" value={`${data?.audio_usage_percent ?? 0}%`} label="uso de áudio" tone="blue" />
      </View>

      <Card style={styles.insight}>
        <View style={styles.insightIcon}>
          <Ionicons name="trending-up-outline" size={27} color={colors.success} />
        </View>
        <View style={styles.flexCopy}>
          <AppText weight="800">Resumo calculado no backend</AppText>
          <AppText variant="small" color={colors.textMuted}>{data?.active_participants ?? 0} alunos praticaram nos últimos {period} dias.</AppText>
        </View>
        <Tag label={`${period} dias`} tone="green" />
      </Card>

      <AppText variant="caption" color={colors.textMuted}>Última atualização: {formatUpdatedAt(updatedAt)}</AppText>

      <SectionTitle>Evolução da atividade</SectionTitle>
      <Card style={styles.chartCard}>
        {progress.evolution.data.filter((day) => day.attempt_count > 0).slice(-14).map((day) => (
          <View key={day.activity_date} style={styles.barRow} accessibilityLabel={`${formatDay(day.activity_date)}: ${day.attempt_count} tentativas`}>
            <View style={styles.barHeading}>
              <AppText variant="small" weight="700">{formatDay(day.activity_date)}</AppText>
              <AppText variant="small" weight="800" color={colors.primary}>{day.attempt_count} tentativas · {day.completed_attempts} concluídas</AppText>
            </View>
            <ProgressBar value={Math.round(100 * day.attempt_count / Math.max(...progress.evolution.data.map((item) => item.attempt_count), 1))} />
          </View>
        ))}
      </Card>

      <SectionTitle>Conclusão por missão</SectionTitle>
      <Card style={styles.chartCard}>
        <AppText variant="small" color={colors.textMuted}>
          Percentual de alunos que concluíram cada atividade.
        </AppText>
        {progress.missions.data.map((mission) => (
          <View
            accessibilityLabel={`${mission.title}: ${mission.completion_percent}% de conclusão`}
            key={mission.assignment_id}
            style={styles.barRow}
          >
            <View style={styles.barHeading}>
              <AppText variant="small" weight="700" style={styles.flexCopy}>{mission.title}</AppText>
              <AppText variant="small" weight="800" color={colors.primary}>{mission.completion_percent}%</AppText>
            </View>
            <ProgressBar value={mission.completion_percent} color={mission.completion_percent >= 70 ? colors.success : colors.primary} height={12} />
          </View>
        ))}
      </Card>

      <SectionTitle>Onde a turma mais pede ajuda</SectionTitle>
      <Card style={styles.difficultyCard}>
        <DifficultyRow label="Tentativas com erro, dica ou ajuda" value={data?.difficulty_percent ?? 0} icon="hand-left-outline" />
      </Card>

      <SectionTitle>Uso dos recursos de apoio</SectionTitle>
      <Card style={styles.supportCard}>
        <SupportColumn icon="volume-high-outline" value={data?.audio_usage_percent ?? 0} label="Áudio" color={colors.blue} background={colors.blueSoft} />
        <SupportColumn icon="hand-left-outline" value={data?.difficulty_percent ?? 0} label="Com apoio" color={colors.primary} background={colors.primarySoft} />
        <SupportColumn icon="bulb-outline" value={data?.autonomy_percent ?? 0} label="Autonomia" color="#8A6000" background={colors.warningSoft} />
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
          label="Exportar CSV e PDF"
          icon="download-outline"
          onPress={handleExport}
        />
      </Card>
      </>}
    </Screen>
  );
}

async function shareAndClean(selectedPath: string, unusedPath: string, mimeType: string) {
  try { await Sharing.shareAsync(selectedPath, { mimeType, dialogTitle: 'Compartilhar relatório' }); }
  finally { await deleteReportFiles([selectedPath, unusedPath]); }
}

function formatUpdatedAt(value: Date | null) {
  return value ? value.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'aguardando dados';
}

function formatDay(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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
