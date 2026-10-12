import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { ConfidencePicker } from '@/components/ConfidencePicker';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, ProgressBar, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useMissionContent } from '@/hooks/useMissionData';
import { useParticipantProgress } from '@/hooks/useProgressData';
import { completeAssessmentResilient } from '@/lib/offline-assessments';
import { submitMissionFeedback } from '@/lib/backend';
import { colors, radius, spacing } from '@/theme/tokens';

const feedbackOptions = [
  ['text_difficult','Texto difícil'],['audio_difficult','Áudio difícil'],['step_unclear','Passo pouco claro'],
  ['too_long','Missão longa'],['technical_problem','Problema técnico'],['none','Nenhuma dificuldade'],
] as const;

export default function ParticipantResultScreen() {
  const router = useRouter();
  const { assignmentId, assessmentId, attemptId, completion } = useLocalSearchParams<{ assignmentId?: string; assessmentId?: string; attemptId?: string; completion?: string }>();
  const [confidenceAfter, setConfidenceAfter] = useState<number | null>(null);
  const [gain, setGain] = useState<number | null>(null);
  const [assessmentPending, setAssessmentPending] = useState(false);
  const [helpful, setHelpful] = useState<number | null>(null);
  const [clarity, setClarity] = useState<number | null>(null);
  const [feedbackIssues, setFeedbackIssues] = useState<string[]>(['none']);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);
  const { currentUser } = useAuth();
  const { preferences } = useApp();
  const query = useMissionContent(assignmentId ?? null);
  const progressQuery = useParticipantProgress();

  useEffect(() => {
    if (preferences.hapticFeedback) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [preferences.hapticFeedback]);

  if (query.loading) return <ResultState kind="loading" retry={query.retry} />;
  if (query.error) return <ResultState kind="error" retry={query.retry} />;
  if (!query.data) return <ResultState kind="empty" retry={query.retry} />;
  const details = query.data.details;
  const progress = progressQuery.data;
  const requiresConfidenceRegistration = Boolean(assessmentId && attemptId) && gain === null && !assessmentPending;

  const continueTrail = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/participant/progress');
  };

  const practiceAgain = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace({ pathname: '/participant/mission-details', params: { assignmentId: details.assignmentId } });
  };

  return (
    <Screen footer={<ParticipantNav active="progress" />} contentStyle={styles.content}>
      <Card style={styles.hero}>
        <View style={styles.successRing}>
          <Ionicons name="checkmark" size={58} color={colors.surface} />
        </View>
        <Tag label="★ Missão Praticada com Sucesso!" tone="green" />
        <View style={styles.heroCopy}>
          <AppText variant="title" weight="800" color={colors.primary} style={styles.center}>
            Você conseguiu!
          </AppText>
          <AppText color={colors.textMuted} style={styles.center}>
            {completion === 'with_help'
              ? 'Você recebeu ajuda e concluiu todos os passos da prática.'
              : completion === 'with_hint'
                ? 'Você usou uma dica e concluiu todos os passos da prática.'
                : 'Você concluiu todos os passos com autonomia.'}
          </AppText>
        </View>
      </Card>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.missionIcon}>
            <Ionicons name="trophy-outline" size={28} color={colors.primary} />
          </View>
          <View style={styles.summaryText}>
            <AppText weight="800">{details.title}</AppText>
            <AppText variant="small" color={colors.textMuted}>Treino seguro concluído</AppText>
          </View>
          <Ionicons name="ribbon-outline" size={28} color={colors.warning} />
        </View>
        <View style={styles.divider} />
        <View style={styles.metrics}>
          <ResultMetric icon="time-outline" value={`${details.estimatedMinutes} min`} label="Tempo" />
          <ResultMetric icon="refresh-outline" value={`${progress?.attempt_count ?? 1}`} label="Tentativas" />
          <ResultMetric icon="trending-up-outline" value={`${progress?.autonomy_percent ?? 0}%`} label="Autonomia" />
        </View>
      </Card>

      <Card style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View>
            <AppText weight="800">Seu progresso geral</AppText>
            <AppText variant="small" color={colors.textMuted}>Mais uma etapa concluída.</AppText>
          </View>
          <AppText variant="subheading" weight="800" color={colors.primary}>{progress?.progress_percent ?? 0}%</AppText>
        </View>
        <ProgressBar value={progress?.progress_percent ?? 0} color={colors.primary} height={12} />
      </Card>

      <Card style={styles.feedbackCard}>
        <View style={styles.feedbackTitleRow}><AppText variant="subheading" weight="800">Ajude a melhorar esta missão</AppText><Tag label="OPCIONAL" tone="purple" /></View>
        <AppText variant="small" color={colors.textMuted}>Sua avaliação orienta melhorias. O painel administrativo recebe somente resultados agregados.</AppText>
        <ConfidencePicker label="Quanto esta missão ajudou você?" value={helpful} onChange={setHelpful} />
        <ConfidencePicker label="A explicação estava clara?" value={clarity} onChange={setClarity} />
        <AppText weight="700">Você encontrou alguma dificuldade?</AppText>
        <View style={styles.issueList}>{feedbackOptions.map(([value,label])=><Button key={value} label={label} variant={feedbackIssues.includes(value)?'primary':'soft'} onPress={()=>setFeedbackIssues((current)=>value==='none'?['none']:current.includes(value)?current.filter((item)=>item!==value):[...current.filter((item)=>item!=='none'),value])}/>)}</View>
        <Button label={feedbackSent?'Avaliação enviada':'Enviar avaliação'} icon="heart-outline" disabled={!attemptId||!helpful||!clarity||feedbackSent||feedbackIssues.length===0} onPress={()=>{setFeedbackError(false);void submitMissionFeedback(attemptId!,helpful!,clarity!,feedbackIssues).then(()=>setFeedbackSent(true)).catch(()=>setFeedbackError(true));}}/>
        {feedbackError?<AppText accessibilityLiveRegion="polite" variant="small" color={colors.danger}>Não foi possível enviar agora. Tente novamente.</AppText>:null}
      </Card>

      <Card style={styles.progressCard}>
        <ConfidencePicker label="E agora, quanta confiança você sente?" value={confidenceAfter} onChange={setConfidenceAfter} />
        <Button label={gain !== null ? `Evolução registrada: ${gain >= 0 ? '+' : ''}${gain}` : confidenceAfter === null ? 'Escolha uma nota de 1 a 5' : 'Registrar minha evolução'} disabled={!confidenceAfter || gain !== null || !assessmentId || !attemptId || !currentUser} onPress={() => void completeAssessmentResilient(currentUser!.id,assessmentId!,attemptId!,confidenceAfter!).then((value) => { if (value === null) setAssessmentPending(true); else setGain(value); }).catch(() => setAssessmentPending(true))} />
        {requiresConfidenceRegistration ? <AppText accessibilityLiveRegion="polite" variant="small" color={colors.textMuted}>Para continuar, escolha como você se sente agora e registre sua evolução. Isso permite comparar sua confiança antes e depois da prática.</AppText> : null}
        {assessmentPending ? <AppText variant="small" color={colors.textMuted}>A missão foi concluída offline. A avaliação poderá ser registrada quando a tentativa terminar de sincronizar.</AppText> : null}
      </Card>

      <View style={styles.actions}>
        <AudioButton
          label="Ouvir resultado"
          message={`Parabéns, ${currentUser?.name || 'aluno'}. Você concluiu a missão ${details.title}.`}
        />
        <Button
          label={requiresConfidenceRegistration ? 'Registre sua evolução para continuar' : 'Continuar'}
          icon="arrow-forward"
          accessibilityHint="Abre a tela do seu progresso"
          onPress={continueTrail}
          disabled={requiresConfidenceRegistration}
        />
        <Button
          label="Praticar novamente"
          icon="refresh-outline"
          variant="secondary"
          accessibilityHint="Volta aos detalhes da missão"
          onPress={practiceAgain}
        />
        <Button label="Compartilhar conquista" icon="share-social-outline" variant="soft" onPress={() => void Share.share({ message: `Hoje aprendi “${details.title}” com o Celular Sem Medo. Treino seguro para usar a tecnologia com mais confiança.` })} />
      </View>
    </Screen>
  );
}

function ResultState({ kind, retry }: { kind: 'loading' | 'error' | 'empty'; retry: () => void }) {
  const router = useRouter();
  return (
    <Screen footer={<ParticipantNav active="missions" />}>
      <DataState kind={kind} title={kind === 'loading' ? 'Carregando resultado' : 'Resultado indisponível'} message="Não foi possível validar a versão desta missão." onRetry={retry} />
      <Button label="Voltar às missões" onPress={() => router.replace('/participant/missions')} />
    </Screen>
  );
}

function ResultMetric({ icon, value, label }: {
  icon: 'time-outline' | 'refresh-outline' | 'trending-up-outline';
  value: string;
  label: string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <AppText weight="800">{value}</AppText>
      <AppText variant="caption" color={colors.textMuted} style={styles.center}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', paddingTop: spacing.xxxl },
  hero: { alignItems: 'center', backgroundColor: '#F3F8F2', borderColor: '#CFEAD8', gap: spacing.lg },
  successRing: { alignItems: 'center', backgroundColor: colors.success, borderColor: colors.successSoft, borderRadius: radius.round, borderWidth: 10, height: 112, justifyContent: 'center', width: 112 },
  heroCopy: { gap: spacing.sm },
  center: { textAlign: 'center' },
  summaryCard: { gap: spacing.lg },
  summaryHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  missionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 58, justifyContent: 'center', width: 58 },
  summaryText: { flex: 1 },
  divider: { backgroundColor: colors.border, height: 1 },
  metrics: { flexDirection: 'row' },
  metric: { alignItems: 'center', flex: 1, gap: spacing.xs },
  progressCard: { backgroundColor: '#F4EEFF', borderColor: colors.primaryMuted, gap: spacing.md },
  feedbackCard: { gap: spacing.md }, feedbackTitleRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' }, issueList: { gap: spacing.sm },
  progressTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  actions: { gap: spacing.md },
});
