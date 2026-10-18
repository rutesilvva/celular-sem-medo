import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

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
  const [showOptional, setShowOptional] = useState(false);
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

  const continueTrail = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/participant/progress');
  };

  const practiceAgain = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace({ pathname: '/participant/mission-details', params: { assignmentId: details.assignmentId, restart: '1' } });
  };

  return (
    <Screen footer={<ParticipantNav active="progress" />} contentStyle={styles.content}>
      <Card style={styles.hero}>
        <View style={styles.successRing}>
          <Ionicons name="checkmark" size={58} color={colors.surface} />
        </View>
        <View style={styles.heroCopy}>
          <AppText variant="title" weight="800" color={colors.primary} style={styles.center}>
            Parabéns! Você concluiu esta missão.
          </AppText>
          <AppText color={colors.textMuted} style={styles.center}>
            {completion === 'with_help'
              ? 'Você recebeu ajuda e concluiu todos os passos da prática.'
              : completion === 'with_hint'
                ? 'Você usou uma dica e concluiu todos os passos da prática.'
                : 'Você concluiu todos os passos sem pedir ajuda.'}
          </AppText>
        </View>
      </Card>

      <Card style={styles.summaryCard}>
        <AppText variant="subheading" weight="800">O que você praticou</AppText>
        <AppText>{learningReview(details.missionId, details.summary)}</AppText>
      </Card>

      <Button label="Concluir missão" icon="checkmark-circle" accessibilityHint="Abre a tela do seu progresso" onPress={continueTrail} />

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showOptional }} onPress={() => setShowOptional((value) => !value)} style={styles.optionalToggle}><View style={styles.optionalCopy}><AppText weight="800">Avaliar ou praticar novamente</AppText><AppText variant="small">Opcional. Você pode concluir sem responder.</AppText></View><Ionicons name={showOptional ? 'chevron-up' : 'chevron-down'} size={25} color={colors.primary} /></Pressable>

      {showOptional ? <><Card style={styles.progressCard}>
        <AppText weight="800">Seu progresso geral</AppText>
        <AppText>{progress?.completed_missions ?? 0} {progress?.completed_missions === 1 ? 'missão concluída' : 'missões concluídas'}.</AppText>
        <ProgressBar value={progress?.progress_percent ?? 0} color={colors.primary} height={12} />
        <AppText variant="small">A porcentagem representa quanto da sua trilha já foi concluído: {progress?.progress_percent ?? 0}%.</AppText>
      </Card>

      <Card style={styles.feedbackCard}>
        <View style={styles.feedbackTitleRow}><AppText variant="subheading" weight="800">Ajude a melhorar esta missão</AppText><Tag label="OPCIONAL" tone="purple" /></View>
        <AppText variant="small" color={colors.textMuted}>Sua avaliação orienta melhorias. O painel administrativo recebe somente resultados agregados.</AppText>
        <ConfidencePicker label="Quanto esta missão ajudou você?" value={helpful} onChange={setHelpful} />
        <ConfidencePicker label="A explicação estava clara?" value={clarity} onChange={setClarity} />
        <AppText weight="700">Você encontrou alguma dificuldade?</AppText>
        <View style={styles.issueList}>{feedbackOptions.map(([value,label])=><Button key={value} label={label} variant={feedbackIssues.includes(value)?'primary':'soft'} onPress={()=>setFeedbackIssues((current)=>value==='none'?['none']:current.includes(value)?current.filter((item)=>item!==value):[...current.filter((item)=>item!=='none'),value])}/>)}</View>
        <Button label={feedbackSent?'Avaliação enviada':'Enviar avaliação'} icon="heart-outline" disabled={!attemptId||!helpful||!clarity||feedbackSent||feedbackIssues.length===0} disabledReason={feedbackSent ? 'Sua avaliação já foi enviada.' : !attemptId ? 'A avaliação ficará disponível quando o progresso for enviado.' : !helpful || !clarity ? 'Responda às duas perguntas para enviar a avaliação.' : feedbackIssues.length === 0 ? 'Escolha se encontrou alguma dificuldade.' : undefined} onPress={()=>{setFeedbackError(false);void submitMissionFeedback(attemptId!,helpful!,clarity!,feedbackIssues).then(()=>setFeedbackSent(true)).catch(()=>setFeedbackError(true));}}/>
        {feedbackError?<AppText accessibilityLiveRegion="polite" variant="small" color={colors.danger}>Não foi possível enviar agora. Tente novamente.</AppText>:null}
      </Card>

      <Card style={styles.progressCard}>
        <ConfidencePicker label="E agora, quanta confiança você sente?" value={confidenceAfter} onChange={setConfidenceAfter} />
        <Button label={gain !== null ? 'Confiança registrada' : 'Registrar como me sinto'} disabled={!confidenceAfter || gain !== null || !assessmentId || !attemptId || !currentUser} disabledReason={gain !== null ? 'Você já registrou como se sente.' : !confidenceAfter ? 'Escolha uma das frases acima para registrar como você se sente.' : !assessmentId || !attemptId || !currentUser ? 'Esta avaliação não está disponível agora. Você pode concluir normalmente.' : undefined} onPress={() => void completeAssessmentResilient(currentUser!.id,assessmentId!,attemptId!,confidenceAfter!).then((value) => { if (value === null) setAssessmentPending(true); else setGain(value); }).catch(() => setAssessmentPending(true))} />
        {assessmentPending ? <AppText accessibilityLiveRegion="polite">Não conseguimos enviar esta avaliação agora. Sua missão continua concluída e tentaremos novamente.</AppText> : null}
      </Card>

      <View style={styles.actions}>
        <AudioButton label="Ouvir este resultado" message={`Parabéns, ${currentUser?.name || 'participante'}. Você concluiu a missão ${details.title}. ${learningReview(details.missionId, details.summary)}`} />
        <Button
          label="Praticar novamente"
          icon="refresh-outline"
          variant="secondary"
          accessibilityHint="Volta aos detalhes da missão"
          onPress={practiceAgain}
        />
        <Button label="Compartilhar conquista" icon="share-social-outline" variant="soft" onPress={() => void Share.share({ message: `Hoje aprendi “${details.title}” com o Celular Sem Medo. Treino seguro para usar a tecnologia com mais confiança.` })} />
      </View>
      </> : null}
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

function learningReview(missionId: string, fallback: string) {
  if (missionId === '10000000-0000-4000-8000-000000000002') return 'Você aprendeu a informar uma chave Pix, conferir nome, banco e valor e cancelar quando encontrar alguma informação diferente.';
  if (missionId === '10000000-0000-4000-8000-000000000007') return 'Você aprendeu a reconhecer pressa, links e pedidos de senha ou código, confirmar pelo aplicativo ou telefone verdadeiro e bloquear a mensagem suspeita.';
  if (missionId === '10000000-0000-4000-8000-000000000008') return 'Você aprendeu a desconfiar de um número novo, confirmar com seu familiar pelo contato antigo e nunca fazer um Pix antes de conferir.';
  return fallback;
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
  optionalToggle: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radius.xl, borderWidth: 2, flexDirection: 'row', gap: spacing.md, minHeight: 64, padding: spacing.lg },
  optionalCopy: { flex: 1, gap: spacing.xs },
});
