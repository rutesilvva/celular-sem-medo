import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, Tag } from '@/components/ui';
import { helpReasonLabels, helpResolutionLabels, helpStatusLabels } from '@/lib/help-copy';
import { createHelpRequest, type HelpReason } from '@/lib/backend';
import { useMyHelpRequests } from '@/hooks/useHelpRequests';
import { colors, radius, spacing } from '@/theme/tokens';
import { enablePushNotifications } from '@/lib/push-notifications';

export default function ParticipantHelpRequestsScreen() {
  const router = useRouter();
  const { attemptId, stepId, id } = useLocalSearchParams<{ attemptId?: string; stepId?: string; id?: string }>();
  const query = useMyHelpRequests();
  const [reason, setReason] = useState<HelpReason>('stuck_step');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pushMessage, setPushMessage] = useState('');
  const canCreate = Boolean(attemptId && stepId);
  const requests = query.data ?? [];
  const openCount = requests.filter((request) => request.status !== 'resolved').length;
  const resolvedCount = requests.filter((request) => request.status === 'resolved').length;

  const submit = async () => {
    if (!attemptId || !stepId || sending) return;
    setSending(true); setSendError(false); setConfirmed(false);
    try {
      await createHelpRequest({ attemptId, stepId, reason });
      setConfirmed(true); query.retry();
    } catch { setSendError(true); }
    finally { setSending(false); }
  };

  return (
    <Screen footer={<ParticipantNav active="profile" />} contentStyle={styles.content}>
      <Header title="Meus pedidos de ajuda" onBack={() => router.canGoBack() ? router.back() : router.replace('/participant/profile')} />
      {canCreate ? <Card style={styles.form}>
        <AppText variant="subheading" weight="800">Pedir ajuda ao suporte</AppText>
        <AppText color={colors.textMuted}>O pedido informa somente a missão e o passo atual. Não escreva dados pessoais.</AppText>
        {(Object.keys(helpReasonLabels) as HelpReason[]).map((key) => <Button key={key} label={helpReasonLabels[key]} variant={reason === key ? 'secondary' : 'soft'} onPress={() => setReason(key)} />)}
        <Button label={sending ? 'Enviando…' : 'Enviar pedido'} icon="chatbubble-ellipses-outline" disabled={sending} onPress={() => void submit()} />
        {confirmed ? <AppText color={colors.successText} weight="800">Pedido enviado com sucesso. O suporte já pode acompanhar sua solicitação.</AppText> : null}
        {sendError ? <View style={styles.error}><AppText color={colors.danger}>O pedido não foi confirmado. Verifique sua conexão e tente novamente.</AppText><Button label="Tentar novamente" variant="secondary" onPress={() => void submit()} /></View> : null}
      </Card> : null}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Ionicons name="time-outline" size={20} color={colors.warning} />
          <View style={styles.summaryCopy}>
            <AppText variant="caption" color={colors.textMuted}>Abertos</AppText>
            <AppText weight="800">{openCount}</AppText>
          </View>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
          <View style={styles.summaryCopy}>
            <AppText variant="caption" color={colors.textMuted}>Resolvidos</AppText>
            <AppText weight="800">{resolvedCount}</AppText>
          </View>
        </View>
      </Card>
      <AppText variant="subheading" weight="800">Andamento</AppText>
      <Button label="Ativar avisos de atualização" icon="notifications-outline" variant="secondary" onPress={() => void enablePushNotifications().then((result) => setPushMessage(result === 'enabled' ? 'Avisos ativados.' : result === 'denied' ? 'Permissão não concedida. Você pode acompanhar por esta tela.' : 'Avisos push estarão disponíveis no build configurado; o acompanhamento nesta tela já funciona.')).catch(() => setPushMessage('Não foi possível ativar os avisos agora.'))} />
      {pushMessage ? <AppText variant="small" color={colors.textMuted}>{pushMessage}</AppText> : null}
      {query.loading ? <DataState kind="loading" title="Carregando pedidos" message="Consultando o andamento no servidor." /> : null}
      {query.error ? <DataState kind="error" title="Não foi possível carregar" message="Verifique sua conexão." onRetry={query.retry} /> : null}
      {!query.loading && !query.error && !query.data.length ? <DataState kind="empty" title="Nenhum pedido de ajuda" message="Quando você pedir apoio durante uma missão, o andamento aparecerá aqui." /> : null}
      {[...query.data].sort((a, b) => Number(b.help_request_id === id) - Number(a.help_request_id === id)).map((request) => <Card key={request.help_request_id} style={[styles.request, request.help_request_id === id ? styles.highlighted : undefined]}>
        <View style={styles.row}><AppText weight="800" style={styles.copy}>{request.mission_title}</AppText><Tag label={helpStatusLabels[request.status]} tone={request.status === 'resolved' ? 'green' : request.status === 'open' ? 'yellow' : 'purple'} /></View>
        <AppText variant="small">Passo: {request.step_title}</AppText>
        <AppText variant="small" color={colors.textMuted}>{helpReasonLabels[request.reason_code as HelpReason] ?? 'Pedido de apoio'}</AppText>
        {request.resolution_code ? <AppText weight="700" color={colors.primary}>{helpResolutionLabels[request.resolution_code as keyof typeof helpResolutionLabels]}</AppText> : <AppText variant="small" color={colors.textMuted}>Aguardando atualização do suporte.</AppText>}
      </Card>)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  form: { gap: spacing.md },
  summaryCard: { alignItems: 'center', backgroundColor: '#F7F3FF', borderColor: colors.primaryMuted, borderRadius: radius.xl, flexDirection: 'row', gap: spacing.lg, justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  summaryItem: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  summaryCopy: { gap: 2 },
  request: { gap: spacing.sm },
  highlighted: { borderColor: colors.primary, borderWidth: 2 },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  copy: { flex: 1 },
  error: { gap: spacing.sm },
});
