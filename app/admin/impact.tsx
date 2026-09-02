import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AdminClassSelector } from '@/components/AdminClassSelector';
import { AdminNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Card, Header, MetricCard } from '@/components/ui';
import { useAdminImpact } from '@/hooks/useAdminManagement';
import { useAdminClass } from '@/hooks/useClassData';
import { colors, spacing } from '@/theme/tokens';

export default function ImpactScreen(){const router=useRouter();const selected=useAdminClass();const query=useAdminImpact(selected.data?.class_id);if(query.loading||selected.loading)return <Screen footer={<AdminNav active="reports"/>}><DataState kind="loading" title="Calculando impacto" message="Consolidando evidências reais."/></Screen>;if(query.error||!query.data)return <Screen footer={<AdminNav active="reports"/>}><DataState kind="error" title="Impacto indisponível" message="Tente novamente." onRetry={query.retry}/></Screen>;const d=query.data;const autonomy=d.completed_missions?Math.round(Number(d.autonomous_completions)*100/Number(d.completed_missions)):0;return <Screen footer={<AdminNav active="reports"/>} contentStyle={styles.content}><Header title="Impacto social" subtitle={selected.data?.class_name??'Todas as turmas'} onBack={()=>router.back()}/><AdminClassSelector selectedId={selected.data?.class_id}/><View style={styles.grid}><MetricCard icon="people-outline" value={`${d.participants}`} label="alunos alcançados"/><MetricCard icon="checkmark-done-outline" value={`${d.completed_missions}`} label="missões concluídas" tone="green"/></View><View style={styles.grid}><MetricCard icon="trending-up-outline" value={`${Number(d.average_confidence_gain??0).toFixed(1)}`} label="ganho médio de confiança" tone="blue"/><MetricCard icon="hand-left-outline" value={`${autonomy}%`} label="conclusões autônomas" tone="yellow"/></View><Card><AppText weight="800">Atendimento</AppText><AppText color={colors.textMuted}>{d.open_help_requests} pedidos abertos · {d.resolved_help_requests} resolvidos</AppText></Card><Card><AppText weight="800">Como interpretar</AppText><AppText variant="small" color={colors.textMuted}>Os indicadores usam tentativas, ajuda e respostas antes/depois. Nenhum nome ou conteúdo pessoal entra nesta visão agregada.</AppText></Card></Screen>}
const styles=StyleSheet.create({content:{gap:spacing.lg},grid:{flexDirection:'row',gap:spacing.md}});
