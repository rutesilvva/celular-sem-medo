import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
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

const difficultyLabels = { easy: 'Fácil', medium: 'Média', hard: 'Difícil' };

export default function ParticipantMissionDetailsScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { assignmentId } = useLocalSearchParams<{ assignmentId?: string }>();
  const query = useMissionContent(assignmentId ?? null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);

  if (query.loading) return <State kind="loading" onRetry={query.retry} />;
  if (query.error) return <State kind="error" onRetry={query.retry} />;
  if (!query.data) return <State kind="empty" onRetry={query.retry} />;

  const { details, steps } = query.data;
  const beginTraining = async () => {
    if (!confidence || starting || !currentUser) return;
    setStarting(true);
    try {
      const assessmentId = await startAssessmentResilient(currentUser.id, details.assignmentId, confidence);
      router.push({ pathname: '/participant/simulator', params: { assignmentId: details.assignmentId, assessmentId } });
    } catch {
      router.push({ pathname: '/participant/simulator', params: { assignmentId: details.assignmentId } });
    } finally { setStarting(false); }
  };

  const presentation = resolveMissionPresentation(details.missionId);
  const isWhatsAppPhotoFlow = presentation === 'whatsapp-photo';
  const isPixFlow = presentation === 'pix';

  if (isPixFlow) {
    return (
      <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.pixContent}>
        <Header title="05 — Detalhes da missão - Pix" onBack={() => router.canGoBack() ? router.back() : router.replace('/participant/missions')} audio />

        <Card style={styles.pixCard}>
          <View style={styles.pixStatusBar}>
            <View style={styles.pixStatusLeft}>
              <Ionicons name="wifi" size={14} color={colors.text} />
              <Ionicons name="cellular" size={14} color={colors.text} />
            </View>
            <AppText variant="caption" weight="700">100%</AppText>
          </View>

          <View style={styles.pixHeaderRow}>
            <Ionicons name="arrow-back" size={28} color={colors.text} />
            <View style={styles.pixSpacer} />
            <Ionicons name="heart-outline" size={28} color={colors.text} />
          </View>

          <View style={styles.pixLogoWrap}>
            <View style={styles.pixLogo}>
              <View style={styles.pixLogoInner} />
            </View>
          </View>

          <AppText variant="heading" weight="800" style={styles.pixTitle}>Fazer um pix{"\n"}seguro</AppText>

          <View style={styles.pixDifficultyPill}>
            <AppText weight="800" color={colors.text}>Médio</AppText>
          </View>

          <View style={styles.pixInfoBoard}>
            <AppText variant="subheading" weight="800" style={styles.pixSectionTitle}>O que vou aprender</AppText>
            <View style={styles.pixBullets}>
              <AppText variant="small" color={colors.textMuted}>• Acessar a área Pix</AppText>
              <AppText variant="small" color={colors.textMuted}>• Informar uma chave Pix</AppText>
              <AppText variant="small" color={colors.textMuted}>• Conferir os dados do destinatário</AppText>
              <AppText variant="small" color={colors.textMuted}>• Informar o valor e confirmar o pagamento</AppText>
            </View>

            <View style={styles.pixMetaBlock}>
              <AppText variant="subheading" weight="800">Tempo estimado</AppText>
              <AppText variant="body" weight="800">8 minutos</AppText>
            </View>

            <View style={styles.pixMetaBlock}>
              <AppText variant="subheading" weight="800">É uma simulação segura</AppText>
              <AppText variant="body" color={colors.textMuted}>Você não usa dinheiro ou dados bancários reais.</AppText>
            </View>
          </View>

          <Card><ConfidencePicker label="Antes de começar, quanta confiança você sente?" value={confidence} onChange={setConfidence} /></Card>
          <Button label={starting ? 'Preparando…' : 'Começar treino'} icon="play" disabled={!confidence || starting} accessibilityHint="Abre o simulador seguro" onPress={() => void beginTraining()} style={styles.pixButton} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title="Detalhes da missão" subtitle={isWhatsAppPhotoFlow ? 'WhatsApp' : 'Missão'} onBack={() => router.canGoBack() ? router.back() : router.replace('/participant/missions')} audio />
      {query.offline ? <Tag label="Missão disponível offline" tone="yellow" /> : null}

      <Card style={styles.hero}>
        <View style={styles.heroTopBar}>
          <View style={styles.signalWrap}>
            <Ionicons name="wifi-outline" size={16} color={colors.text} />
            <AppText variant="caption" weight="700">100%</AppText>
          </View>
        </View>

        <View style={styles.heroIconWrap}>
          <View style={styles.heroIcon}><Ionicons name="chatbubble-ellipses" size={42} color={colors.surface} /></View>
        </View>

        <AppText variant="heading" weight="800" style={styles.title}>{isWhatsAppPhotoFlow ? 'Enviar uma foto pelo WhatsApp' : details.title}</AppText>
        <View style={styles.badgeRow}>
          <Tag label={isWhatsAppPhotoFlow ? 'Fácil' : difficultyLabels[details.difficulty]} tone="green" />
        </View>

        <AppText color={colors.textMuted} style={styles.center}>
          {isWhatsAppPhotoFlow ? 'Nesta missão você vai aprender a localizar o botão de anexo e escolher uma foto com segurança.' : details.summary}
        </AppText>
      </Card>

      <Card style={styles.listCard}>
        <AppText variant="subheading" weight="800">O que você vai aprender</AppText>
        <View style={styles.bullets}>
          <AppText variant="small" color={colors.textMuted}>• Abrir o WhatsApp</AppText>
          <AppText variant="small" color={colors.textMuted}>• Anexar uma foto</AppText>
          <AppText variant="small" color={colors.textMuted}>• Enviar para um contato</AppText>
        </View>
      </Card>

      <Card style={styles.summaryCard}>
        <SummaryItem icon="time-outline" value={`${details.estimatedMinutes} min`} label="Tempo estimado" />
        <View style={styles.verticalDivider} />
        <SummaryItem icon="leaf-outline" value={isWhatsAppPhotoFlow ? 'Fácil' : difficultyLabels[details.difficulty]} label="Nível" />
        <View style={styles.verticalDivider} />
        <SummaryItem icon="list-outline" value="Segura" label="Simulação" />
      </Card>

      <Card style={styles.reassurance}>
        <Ionicons name="shield-checkmark" size={28} color={colors.success} />
        <AppText style={styles.reassuranceCopy}>{isWhatsAppPhotoFlow ? 'É uma simulação segura. Você não envia dados reais.' : details.safetyNote}</AppText>
      </Card>

      <View style={styles.actions}>
        <Card><ConfidencePicker label="Antes de começar, quanta confiança você sente?" value={confidence} onChange={setConfidence} /></Card>
        <AudioButton label="Ouvir explicação" message={steps.map((step) => step.audioText).join(' ')} />
        <Button label={starting ? 'Preparando…' : 'Começar treino'} icon="play" disabled={!confidence || starting} accessibilityHint="Abre o simulador seguro" onPress={() => void beginTraining()} />
      </View>
    </Screen>
  );
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

function SummaryItem({ icon, value, label }: { icon: 'time-outline' | 'leaf-outline' | 'list-outline'; value: string; label: string }) {
  return <View style={styles.summaryItem}><Ionicons name={icon} size={23} color={colors.primary} /><AppText weight="800" style={styles.center}>{value}</AppText><AppText variant="caption" color={colors.textMuted} style={styles.center}>{label}</AppText></View>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
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
  summaryCard: { alignItems: 'stretch', backgroundColor: '#FFFDFC', borderColor: colors.primaryMuted, borderRadius: radius.lg, flexDirection: 'row', paddingHorizontal: spacing.sm },
  summaryItem: { alignItems: 'center', flex: 1, gap: spacing.xs, paddingHorizontal: spacing.xs },
  verticalDivider: { backgroundColor: colors.border, width: 1 },
  reassurance: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  reassuranceCopy: { flex: 1 },
  actions: { gap: spacing.md },
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
