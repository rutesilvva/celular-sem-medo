import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, Tag } from '@/components/ui';
import { useAdminClass } from '@/hooks/useClassData';
import { useMonitorHelpRequests } from '@/hooks/useHelpRequests';
import { helpReasonLabels, helpResolutionLabels, helpStatusLabels } from '@/lib/help-copy';
import { updateHelpRequest, type HelpReason, type HelpResolution, type MonitorHelpRequest } from '@/lib/backend';
import { colors, spacing } from '@/theme/tokens';
import { enablePushNotifications } from '@/lib/push-notifications';

const resolutions: HelpResolution[] = ['review_hint', 'try_again', 'scheduled_support', 'guided_by_monitor'];

export default function AdminHelpRequestsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const classQuery = useAdminClass();
  const query = useMonitorHelpRequests(classQuery.data?.class_id ?? null);
  const [pushMessage, setPushMessage] = useState('');
  if (classQuery.loading || query.loading) return <Screen footer={<AdminNav active="home" />}><Header title="Pedidos de ajuda" /><DataState kind="loading" title="Carregando pedidos" message="Buscando solicitações da turma." /></Screen>;
  if (classQuery.error || query.error) return <Screen footer={<AdminNav active="home" />}><Header title="Pedidos de ajuda" /><DataState kind="error" title="Não foi possível carregar" message="Verifique sua conexão e tente novamente." onRetry={() => { classQuery.retry(); query.retry(); }} /></Screen>;
  return <Screen footer={<AdminNav active="home" />} contentStyle={styles.content}>
    <Header title="Pedidos de ajuda" subtitle={classQuery.data?.class_name} onBack={() => router.replace('/admin/home')} />
    <Button label="Ativar avisos de novos pedidos" icon="notifications-outline" variant="secondary" onPress={() => void enablePushNotifications().then((result) => setPushMessage(result === 'enabled' ? 'Avisos ativados.' : result === 'denied' ? 'Permissão não concedida.' : 'Disponível após configurar o build EAS.')).catch(() => setPushMessage('Não foi possível ativar os avisos agora.'))} />
    {pushMessage ? <AppText variant="small" color={colors.textMuted}>{pushMessage}</AppText> : null}
    {!query.data.length ? <DataState kind="empty" title="Nenhum pedido" message="Novos pedidos dos participantes aparecerão aqui." /> : [...query.data].sort((a, b) => Number(b.help_request_id === id) - Number(a.help_request_id === id)).map((request) => <RequestCard key={request.help_request_id} request={request} retry={query.retry} highlighted={request.help_request_id === id} />)}
  </Screen>;
}

function RequestCard({ request, retry, highlighted }: { request: MonitorHelpRequest; retry: () => void; highlighted: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const change = async (status: 'in_progress' | 'resolved', resolution?: HelpResolution) => {
    setBusy(true); setError(false);
    try { await updateHelpRequest(request.help_request_id, status, resolution); retry(); }
    catch { setError(true); }
    finally { setBusy(false); }
  };
  return <Card style={[styles.card, highlighted ? styles.highlighted : undefined]}>
    <View style={styles.row}><View style={styles.copy}><AppText variant="subheading" weight="800">{request.participant_name}</AppText><AppText variant="small" color={colors.textMuted}>{request.mission_title} • {request.step_title}</AppText></View><Tag label={helpStatusLabels[request.status]} tone={request.status === 'resolved' ? 'green' : request.status === 'open' ? 'yellow' : 'purple'} /></View>
    <AppText>{helpReasonLabels[request.reason_code as HelpReason] ?? 'Pedido de apoio'}</AppText>
    {request.status === 'open' ? <Button label="Iniciar atendimento" icon="hand-left-outline" disabled={busy} onPress={() => void change('in_progress')} /> : null}
    {request.status === 'in_progress' ? <View style={styles.actions}><AppText weight="800">Orientação enviada ao participante:</AppText>{resolutions.map((resolution) => <Button key={resolution} label={helpResolutionLabels[resolution]} variant="secondary" disabled={busy} onPress={() => void change('resolved', resolution)} />)}</View> : null}
    {request.resolution_code ? <AppText color={colors.successText}>{helpResolutionLabels[request.resolution_code as HelpResolution]}</AppText> : null}
    {error ? <AppText color={colors.danger}>A alteração não foi confirmada. Tente novamente.</AppText> : null}
  </Card>;
}

const styles = StyleSheet.create({ content: { gap: spacing.lg }, card: { gap: spacing.md }, highlighted: { borderColor: colors.primary, borderWidth: 2 }, row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm }, copy: { flex: 1, gap: spacing.xs }, actions: { gap: spacing.sm } });
