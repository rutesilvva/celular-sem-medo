import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AdminClassSelector } from '@/components/AdminClassSelector';
import { AdminNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Card, Header, MetricCard, ProgressBar, Tag } from '@/components/ui';
import { describeImpactChange, type ImpactComparison } from '@/features/impact/story';
import { useAdminImpact, useAdminMissionFeedback, useAdminPrePostImpact } from '@/hooks/useAdminManagement';
import { useAdminClass } from '@/hooks/useClassData';
import { colors, spacing } from '@/theme/tokens';

export default function ImpactScreen() {
  const router = useRouter();
  const selected = useAdminClass();
  const query = useAdminImpact(selected.data?.class_id);
  const comparison = useAdminPrePostImpact(selected.data?.class_id);
  const feedback = useAdminMissionFeedback(selected.data?.class_id);
  if (query.loading || comparison.loading || feedback.loading || selected.loading) return <Screen footer={<AdminNav active="reports" />}><DataState kind="loading" title="Calculando impacto" message="Consolidando evidências reais." /></Screen>;
  if (query.error || comparison.error || feedback.error || !query.data) return <Screen footer={<AdminNav active="reports" />}><DataState kind="error" title="Impacto indisponível" message="Tente novamente." onRetry={() => { query.retry(); comparison.retry(); feedback.retry(); }} /></Screen>;
  const d = query.data;
  const c = comparison.data;
  const f = feedback.data;
  const autonomy = d.completed_missions ? Math.round(Number(d.autonomous_completions) * 100 / Number(d.completed_missions)) : 0;
  const helpReduction = c ? Math.max(0, Number(c.help_first ?? 0) - Number(c.help_latest ?? 0)) : 0;
  return <Screen footer={<AdminNav active="reports" />} contentStyle={styles.content}>
    <Header title="Impacto em uma tela" subtitle={selected.data?.class_name ?? 'Todas as turmas'} onBack={() => router.back()} />
    <AdminClassSelector selectedId={selected.data?.class_id} />
    <Card style={styles.hero}><View style={styles.heroHeading}><View style={styles.flex}><AppText variant="caption" weight="800" color={colors.primary}>RESULTADO DA OFICINA</AppText><AppText variant="heading" weight="800">Antes, prática e evolução</AppText></View><Tag label={`${d.participants} alunos`} tone="purple" /></View><AppText variant="small" color={colors.textMuted}>Indicadores agregados, calculados com avaliações e atividades registradas.</AppText></Card>
    {c ? <Card style={styles.comparison}><AppText variant="subheading" weight="800">Comparação antes e depois</AppText><Comparison label="Confiança média" before={Number(c.confidence_before ?? 0)} after={Number(c.confidence_after ?? 0)} max={5} /><Comparison label="Autonomia" before={Number(c.autonomy_first ?? 0)} after={Number(c.autonomy_latest ?? 0)} max={100} suffix="%" /><Comparison label="Pedidos de ajuda" before={Number(c.help_first ?? 0)} after={Number(c.help_latest ?? 0)} max={Math.max(Number(c.help_first ?? 0), Number(c.help_latest ?? 0), 1)} lowerIsBetter /></Card> : null}
    <View style={styles.grid}><MetricCard icon="shield-checkmark-outline" value={`${Number(c?.scam_recognition_percent ?? 0).toFixed(0)}%`} label="reconhecem golpes" tone="green" /><MetricCard icon="checkmark-done-outline" value={`${d.completed_missions}`} label="missões concluídas" tone="green" /></View>
    <View style={styles.grid}><MetricCard icon="hand-left-outline" value={`${autonomy}%`} label="conclusões autônomas" tone="yellow" /><MetricCard icon="trending-down-outline" value={`${helpReduction}`} label="pedidos de ajuda reduzidos" tone="blue" /></View>
    {f ? <Card style={styles.comparison}><AppText variant="subheading" weight="800">Qualidade das missões</AppText><View style={styles.grid}><MetricCard icon="heart-outline" value={`${Number(f.average_helpful ?? 0).toFixed(1)}/5`} label="utilidade percebida" tone="green" /><MetricCard icon="eye-outline" value={`${Number(f.average_clarity ?? 0).toFixed(1)}/5`} label="clareza" tone="blue" /></View><AppText variant="small" color={colors.textMuted}>{f.response_count} resposta(s) · dificuldades: {f.step_unclear} passo pouco claro, {f.text_difficult} texto, {f.audio_difficult} áudio, {f.technical_problem} técnica.</AppText></Card> : null}
    <Card><AppText weight="800">Como interpretar</AppText><AppText variant="small" color={colors.textMuted}>Confiança compara avaliações antes e depois. Autonomia e ajuda comparam a primeira e a prática mais recente. Reconhecimento de golpes representa o diagnóstico atual. Nenhum aluno é identificado.</AppText></Card>
  </Screen>;
}

function Comparison(props: ImpactComparison & { max: number }) {
  const { label, before, after, max, suffix = '', lowerIsBetter } = props;
  const change = describeImpactChange({ label, before, after, suffix, lowerIsBetter });
  return <View style={styles.comparisonRow}><View style={styles.labels}><View style={styles.labelRow}><AppText weight="700">{label}</AppText><View style={[styles.delta, change.tone === 'positive' ? styles.deltaPositive : change.tone === 'attention' ? styles.deltaAttention : styles.deltaNeutral]}><AppText variant="caption" weight="800">{change.label}</AppText></View></View><AppText variant="small" color={colors.textMuted}>Antes: {before.toFixed(1)}{suffix} · Depois: {after.toFixed(1)}{suffix}</AppText></View><ProgressBar value={max ? after * 100 / max : 0} /></View>;
}

const styles = StyleSheet.create({ content: { gap: spacing.lg }, flex: { flex: 1 }, grid: { flexDirection: 'row', gap: spacing.md }, hero: { backgroundColor: colors.primarySoft, borderColor: colors.primary, gap: spacing.sm }, heroHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }, comparison: { gap: spacing.lg }, comparisonRow: { gap: spacing.sm }, labels: { gap: spacing.xs }, labelRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' }, delta: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4 }, deltaPositive: { backgroundColor: colors.successSoft }, deltaAttention: { backgroundColor: colors.warningSoft }, deltaNeutral: { backgroundColor: colors.background } });
