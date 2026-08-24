import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, ProgressBar } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useMissionContent } from '@/hooks/useMissionData';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ParticipantResultScreen() {
  const router = useRouter();
  const { assignmentId, completion } = useLocalSearchParams<{ assignmentId?: string; completion?: string }>();
  const { mission, participantProgress } = useApp();
  const { currentUser } = useAuth();
  const query = useMissionContent(assignmentId ?? null);

  if (query.loading) return <ResultState kind="loading" retry={query.retry} />;
  if (query.error) return <ResultState kind="error" retry={query.retry} />;
  if (!query.data) return <ResultState kind="empty" retry={query.retry} />;
  const details = query.data.details;

  const continueTrail = () => {
    router.dismissAll();
    router.replace('/participant/progress');
  };

  const practiceAgain = () => {
    router.dismissAll();
    router.replace({ pathname: '/participant/mission-details', params: { assignmentId: details.assignmentId } });
  };

  return (
    <Screen footer={<ParticipantNav active="progress" />} contentStyle={styles.content}>
      <View style={styles.confetti} pointerEvents="none">
        <View style={[styles.confettiPiece, styles.pieceOne]} />
        <View style={[styles.confettiPiece, styles.pieceTwo]} />
        <View style={[styles.confettiPiece, styles.pieceThree]} />
        <View style={[styles.confettiPiece, styles.pieceFour]} />
      </View>

      <View accessibilityRole="header" style={styles.hero}>
        <View style={styles.successRing}>
          <Ionicons name="checkmark" size={58} color={colors.surface} />
        </View>
        <View style={styles.heroCopy}>
          <AppText variant="title" weight="800" color={colors.primary} style={styles.center}>
            Você conseguiu!
          </AppText>
          <AppText variant="subheading" weight="700" style={styles.center}>
            Missão concluída com coragem
          </AppText>
          <AppText color={colors.textMuted} style={styles.center}>
            {completion === 'with_help'
              ? 'Você recebeu ajuda e concluiu todos os passos da prática.'
              : completion === 'with_hint'
                ? 'Você usou uma dica e concluiu todos os passos da prática.'
                : 'Você concluiu todos os passos com autonomia.'}
          </AppText>
        </View>
      </View>

      <Card style={styles.achievementCard}>
        <View style={styles.achievementTop}>
          <View style={styles.missionIcon}>
            <Ionicons name="image-outline" size={30} color={colors.primary} />
          </View>
          <View style={styles.achievementCopy}>
            <AppText weight="800">{details.title}</AppText>
            <AppText variant="small" color={colors.textMuted}>Treino seguro finalizado</AppText>
          </View>
          <Ionicons name="ribbon" size={34} color={colors.warning} />
        </View>
        <View style={styles.divider} />
        <View style={styles.metrics}>
          <ResultMetric icon="time-outline" value={`${details.estimatedMinutes} min`} label="Duração estimada" />
          <ResultMetric icon="refresh-outline" value={`${Math.max(1, mission.attempts)}`} label="Tentativas" />
          <ResultMetric icon="trending-up-outline" value="+8%" label="Evolução" />
        </View>
      </Card>

      <Card style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View>
            <AppText weight="800">Progresso da sua trilha</AppText>
            <AppText variant="small" color={colors.textMuted}>Uma nova habilidade aprendida.</AppText>
          </View>
          <AppText variant="subheading" weight="800" color={colors.successText}>{participantProgress}%</AppText>
        </View>
        <ProgressBar value={participantProgress} color={colors.success} height={12} />
      </Card>

      <View style={styles.actions}>
        <AudioButton
          label="Ouvir resultado"
          message={`Parabéns, ${currentUser?.name || 'participante'}. Você concluiu a missão ${details.title} e avançou para ${participantProgress} por cento da sua trilha.`}
        />
        <Button
          label="Continuar minha trilha"
          icon="arrow-forward"
          accessibilityHint="Abre a tela do seu progresso"
          onPress={continueTrail}
        />
        <Button
          label="Praticar novamente"
          icon="refresh-outline"
          variant="secondary"
          accessibilityHint="Volta aos detalhes da missão"
          onPress={practiceAgain}
        />
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
  confetti: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  confettiPiece: { borderRadius: radius.sm, height: 14, position: 'absolute', width: 8 },
  pieceOne: { backgroundColor: colors.yellow, left: '8%', top: 36, transform: [{ rotate: '24deg' }] },
  pieceTwo: { backgroundColor: colors.primaryMuted, right: '10%', top: 90, transform: [{ rotate: '-18deg' }] },
  pieceThree: { backgroundColor: colors.success, left: '17%', top: 180, transform: [{ rotate: '-32deg' }] },
  pieceFour: { backgroundColor: colors.blue, right: '16%', top: 220, transform: [{ rotate: '36deg' }] },
  hero: { alignItems: 'center', gap: spacing.lg },
  successRing: { alignItems: 'center', backgroundColor: colors.success, borderColor: colors.successSoft, borderRadius: radius.round, borderWidth: 10, height: 112, justifyContent: 'center', width: 112 },
  heroCopy: { gap: spacing.sm },
  center: { textAlign: 'center' },
  achievementCard: { gap: spacing.lg },
  achievementTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  missionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 58, justifyContent: 'center', width: 58 },
  achievementCopy: { flex: 1 },
  divider: { backgroundColor: colors.border, height: 1 },
  metrics: { flexDirection: 'row' },
  metric: { alignItems: 'center', flex: 1, gap: spacing.xs },
  progressCard: { backgroundColor: colors.successSoft, borderColor: '#BEE8CE', gap: spacing.md },
  progressTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  actions: { gap: spacing.md },
});
