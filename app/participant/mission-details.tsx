import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { ParticipantNav } from '@/components/BottomNav';
import { ConfidencePicker } from '@/components/ConfidencePicker';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, Tag } from '@/components/ui';
import { useMissionContent } from '@/hooks/useMissionData';
import { useAuth } from '@/context/AuthContext';
import { colors, radius, spacing } from '@/theme/tokens';
import { startAssessmentResilient } from '@/lib/offline-assessments';
import { resolveMissionPresentation } from '@/features/mission-engine/presentation';
import { downloadMissionPackage } from '@/lib/mission-downloads';

const difficultyLabels = { easy: 'Fácil', medium: 'Média', hard: 'Difícil' };

export default function ParticipantMissionDetailsScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { assignmentId, restart } = useLocalSearchParams<{ assignmentId?: string; restart?: string }>();
  const query = useMissionContent(assignmentId ?? null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  if (query.loading) return <State kind="loading" onRetry={query.retry} />;
  if (query.error) return <State kind="error" onRetry={query.retry} />;
  if (!query.data) return <State kind="empty" onRetry={query.retry} />;

  const { details, steps } = query.data;
  const beginTraining = async () => {
    if (starting || !currentUser) return;
    setStarting(true);

    if (!confidence) {
      router.push({ pathname: '/participant/simulator', params: { assignmentId: details.assignmentId, restart: restart === '1' ? '1' : '0' } });
      setStarting(false);
      return;
    }

    try {
      const assessmentId = await startAssessmentResilient(currentUser.id, details.assignmentId, confidence);
      router.push({ pathname: '/participant/simulator', params: { assignmentId: details.assignmentId, assessmentId, restart: restart === '1' ? '1' : '0' } });
    } catch {
      router.push({ pathname: '/participant/simulator', params: { assignmentId: details.assignmentId, restart: restart === '1' ? '1' : '0' } });
    } finally { setStarting(false); }
  };

  const presentation = resolveMissionPresentation(details.missionId);
  const isWhatsAppPhotoFlow = presentation === 'whatsapp-photo';
  const isPixFlow = presentation === 'pix';
  const isScamMessageFlow = details.missionId === '10000000-0000-4000-8000-000000000007';
  const isFakeFamilyFlow = details.missionId === '10000000-0000-4000-8000-000000000008';
  const isLocationSharingFlow = details.missionId === '10000000-0000-4000-8000-000000000003';
  const isMobilityFlow = details.missionId === '10000000-0000-4000-8000-000000000004';
  const learningGoals = isLocationSharingFlow ? [
    'Abrir os anexos e encontrar a opção Localização',
    'Diferenciar localização atual e em tempo real',
    'Conferir quem receberá sua posição',
    'Escolher o menor tempo necessário',
    'Revisar, enviar e parar o compartilhamento',
  ] : isFakeFamilyFlow ? [
    'Desconfiar de familiar falando por um número novo',
    'Não dar nomes ou informações que ajudem o golpista',
    'Confirmar a identidade pelo número antigo',
    'Reconhecer urgência, segredo e pedido de Pix',
    'Conferir o nome do recebedor, bloquear e denunciar',
  ] : isScamMessageFlow ? [
    'Reconhecer pressa, ameaça e prêmio inesperado',
    'Conferir remetente, número e link suspeito',
    'Proteger senha, cartão e código recebido por SMS',
    'Confirmar pedidos de Pix de familiares por outro contato',
    'Usar o canal oficial, bloquear e denunciar o golpe',
  ] : isMobilityFlow ? [
    'Abrir o aplicativo e informar para onde você vai',
    'Conferir o endereço e o ponto de partida no mapa',
    'Comparar categoria, preço estimado e forma de pagamento',
    'Revisar todos os dados antes de pedir o carro',
    'Conferir placa, modelo, cor e foto antes de entrar',
  ] : isWhatsAppPhotoFlow ? [
    'Abrir o aplicativo de mensagens',
    'Localizar o botão de anexo',
    'Escolher uma foto e conferir o contato antes de enviar',
  ] : steps.slice(0, 5).map((step) => step.title);

  if (isPixFlow) {
    return (
      <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
        <Header title="Detalhes da missão" onBack={() => router.canGoBack() ? router.back() : router.replace('/participant/missions')} />
        <Card style={styles.simpleHero}>
          <View style={styles.heroIcon}><Ionicons name="shield-checkmark" size={42} color={colors.surface} /></View>
          <View style={styles.heroCopy}>
            <AppText variant="heading" weight="800">Fazer um Pix seguro</AppText>
            <AppText>Aprenda passo a passo a informar a chave, digitar o valor e conferir nome, banco e valor antes de enviar.</AppText>
          </View>
        </Card>
        <Card style={styles.reassurance}>
          <Ionicons name="shield-checkmark" size={28} color={colors.success} />
          <AppText style={styles.reassuranceCopy}>Esta é uma simulação. Nenhum dado ou dinheiro real será usado.</AppText>
        </Card>
        <Button label={starting ? 'Preparando o passo a passo…' : restart === '1' ? 'Começar novamente do passo 1' : 'Começar passo a passo'} icon="play" disabled={starting} disabledReason={starting ? 'Aguarde enquanto preparamos a missão.' : undefined} onPress={() => void beginTraining()} />
        <Card style={styles.listCard}>
          <AppText variant="subheading" weight="800">O que você vai aprender</AppText>
          <View style={styles.bullets}>{learningGoals.map((goal) => <View key={goal} style={styles.learningGoal}><Ionicons name="checkmark-circle-outline" size={24} color={colors.success} /><AppText style={styles.learningGoalText}>{goal}</AppText></View>)}</View>
        </Card>
        <MoreOptions expanded={showMoreOptions} onPress={() => setShowMoreOptions((value) => !value)} />
        {showMoreOptions ? <View style={styles.actions}>
          <AppText>Tempo aproximado: {details.estimatedMinutes} minutos. Nível: {difficultyLabels[details.difficulty]}.</AppText>
          <Card><ConfidencePicker label="Como você se sente antes de começar? (opcional)" value={confidence} onChange={setConfidence} /><AppText variant="small">Você pode deixar esta pergunta sem resposta.</AppText></Card>
          <AudioButton label="Ouvir esta explicação" message={steps.map((step) => step.audioText).join(' ')} />
          <Button label={downloading ? 'Baixando…' : 'Baixar para usar sem internet'} icon="download-outline" variant="secondary" disabled={downloading || !currentUser} disabledReason={downloading ? 'Aguarde o download terminar.' : !currentUser ? 'Entre na sua conta para baixar esta missão.' : undefined} onPress={() => { if (!currentUser) return; setDownloading(true); setDownloadMessage(''); void downloadMissionPackage(currentUser.id, details.assignmentId).then(() => setDownloadMessage('Missão salva neste aparelho.')).catch(() => setDownloadMessage('Não foi possível baixar agora.')).finally(() => setDownloading(false)); }} />
          {downloadMessage ? <AppText accessibilityLiveRegion="polite" color={downloadMessage.startsWith('Missão salva') ? colors.success : colors.danger}>{downloadMessage}</AppText> : null}
        </View> : null}
      </Screen>
    );
  }

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title="Detalhes da missão" subtitle={isWhatsAppPhotoFlow ? 'WhatsApp' : 'Missão'} onBack={() => router.canGoBack() ? router.back() : router.replace('/participant/missions')} audio />
      {query.offline ? <Tag label="Missão disponível offline" tone="yellow" /> : null}

      <Card style={styles.simpleHero}>
        <View style={styles.heroIcon}><Ionicons name="shield-checkmark" size={42} color={colors.surface} /></View>
        <View style={styles.heroCopy}>
          <AppText variant="heading" weight="800">{isWhatsAppPhotoFlow ? 'Enviar uma foto pelo WhatsApp' : details.title}</AppText>
          <AppText>{isWhatsAppPhotoFlow ? 'Aprenda a encontrar o botão de anexo, escolher uma foto e conferir o contato antes de enviar.' : isMobilityFlow ? 'Aprenda, em oito passos, a pedir uma viagem e conferir o carro com segurança — sem chamar um motorista de verdade.' : details.summary}</AppText>
        </View>
      </Card>

      <Card style={styles.reassurance}><Ionicons name="shield-checkmark" size={28} color={colors.success} /><AppText style={styles.reassuranceCopy}>Esta é uma simulação. Nenhum dado ou dinheiro real será usado.</AppText></Card>

      <Button label={starting ? 'Preparando o passo a passo…' : restart === '1' ? 'Começar novamente do passo 1' : 'Começar passo a passo'} icon="play" disabled={starting} disabledReason={starting ? 'Aguarde enquanto preparamos a missão.' : undefined} accessibilityHint="Abre o simulador seguro" onPress={() => void beginTraining()} />

      <Card style={styles.listCard}>
        <AppText variant="subheading" weight="800">O que você vai aprender</AppText>
        <View style={styles.bullets}>
          {learningGoals.map((goal) => <View key={goal} style={styles.learningGoal}><Ionicons name="checkmark-circle-outline" size={22} color={colors.success} /><AppText variant="small" color={colors.textMuted} style={styles.learningGoalText}>{goal}</AppText></View>)}
        </View>
      </Card>

      <MoreOptions expanded={showMoreOptions} onPress={() => setShowMoreOptions((value) => !value)} />
      {showMoreOptions ? <View style={styles.actions}>
        <AppText>Tempo aproximado: {details.estimatedMinutes} minutos. Nível: {isWhatsAppPhotoFlow ? 'Fácil' : difficultyLabels[details.difficulty]}.</AppText>
        <Card>
          <ConfidencePicker label="Como você se sente antes de começar? (opcional)" value={confidence} onChange={setConfidence} />
          <AppText variant="small">Você pode deixar esta pergunta sem resposta.</AppText>
        </Card>
        <AudioButton label="Ouvir esta explicação" message={steps.map((step) => step.audioText).join(' ')} />
        <Button label={downloading ? 'Baixando…' : 'Baixar para usar sem internet'} icon="download-outline" variant="secondary" disabled={downloading || !currentUser} disabledReason={downloading ? 'Aguarde o download terminar.' : !currentUser ? 'Entre na sua conta para baixar esta missão.' : undefined} onPress={() => { if (!currentUser) return; setDownloading(true); setDownloadMessage(''); void downloadMissionPackage(currentUser.id, details.assignmentId).then(() => setDownloadMessage('Missão salva neste aparelho.')).catch(() => setDownloadMessage('Não foi possível baixar agora.')).finally(() => setDownloading(false)); }} />
        {downloadMessage ? <AppText accessibilityLiveRegion="polite" color={downloadMessage.startsWith('Missão salva') ? colors.success : colors.danger}>{downloadMessage}</AppText> : null}
      </View> : null}
    </Screen>
  );
}

function MoreOptions({ expanded, onPress }: { expanded: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onPress} style={styles.moreOptionsButton}><AppText weight="800">{expanded ? 'Esconder mais opções' : 'Mostrar mais opções'}</AppText><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color={colors.primary} /></Pressable>;
}

function State({ kind, onRetry }: { kind: 'loading' | 'error' | 'empty'; onRetry: () => void }) {
  const router = useRouter();
  return (
    <Screen footer={<ParticipantNav active="missions" />}>
      <Header title="Missão" onBack={() => router.replace('/participant/missions')} />
      <DataState
        kind={kind}
        title={kind === 'loading' ? 'Carregando missão' : kind === 'error' ? 'Não foi possível carregar' : 'Missão indisponível'}
        message={kind === 'empty' ? 'Ela pode ter sido removida, encerrada ou ainda não foi publicada.' : 'Buscando a versão publicada para sua turma.'}
        onRetry={onRetry}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  simpleHero: { alignItems: 'flex-start', backgroundColor: '#F9F3FF', borderColor: colors.primaryMuted, flexDirection: 'row', gap: spacing.md },
  heroCopy: { flex: 1, gap: spacing.sm },
  pixContent: { backgroundColor: '#dfe0df', gap: spacing.lg },
  hero: { alignItems: 'center', backgroundColor: '#F9F3FF', borderColor: colors.primaryMuted, borderRadius: radius.xl, gap: spacing.md, padding: spacing.lg },
  heroTopBar: { alignItems: 'center', justifyContent: 'flex-end', width: '100%' },
  signalWrap: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  heroTopRow: { flexDirection: 'row', gap: spacing.sm },
  heroIconWrap: { alignItems: 'center', justifyContent: 'center' },
  heroIcon: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.round, height: 88, justifyContent: 'center', width: 88 },
  title: { marginTop: spacing.xs, textAlign: 'center' },
  badgeRow: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  center: { textAlign: 'center' },
  listCard: { backgroundColor: colors.surface, borderColor: colors.primaryMuted, borderRadius: radius.lg, gap: spacing.md, padding: spacing.md },
  bullets: { gap: spacing.sm },
  learningGoal: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  learningGoalText: { flex: 1 },
  summaryCard: { alignItems: 'stretch', backgroundColor: '#FFFDFC', borderColor: colors.primaryMuted, borderRadius: radius.lg, flexDirection: 'row', paddingHorizontal: spacing.sm },
  summaryItem: { alignItems: 'center', flex: 1, gap: spacing.xs, paddingHorizontal: spacing.xs },
  verticalDivider: { backgroundColor: colors.border, width: 1 },
  reassurance: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  reassuranceCopy: { flex: 1 },
  actions: { gap: spacing.md },
  moreOptionsButton: { alignItems: 'center', borderColor: colors.primary, borderRadius: radius.xl, borderWidth: 2, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  pixCard: { backgroundColor: '#f5f4f2', borderColor: '#e9e4df', borderRadius: 28, gap: spacing.lg, padding: spacing.lg },
  pixStatusBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  pixStatusLeft: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  pixHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  pixSpacer: { flex: 1 },
  pixLogoWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  pixLogo: { alignItems: 'center', backgroundColor: '#5bb8be', borderRadius: 26, height: 118, justifyContent: 'center', transform: [{ rotate: '45deg' }], width: 118 },
  pixLogoInner: { backgroundColor: '#d7f0f0', borderRadius: 18, height: 72, width: 72 },
  pixTitle: { color: '#4a2d7b', fontSize: 38, lineHeight: 42, textAlign: 'center' },
  pixDifficultyPill: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#e8d9a0', borderRadius: 20, paddingHorizontal: 22, paddingVertical: 10, width: 170 },
  pixInfoBoard: { backgroundColor: '#e7e5e2', borderRadius: 18, gap: spacing.md, padding: spacing.lg },
  pixSectionTitle: { marginBottom: 4 },
  pixBullets: { gap: 8 },
  pixMetaBlock: { gap: 6 },
  pixButton: { alignSelf: 'stretch', backgroundColor: '#4a2d7b', borderRadius: 14 },
});
