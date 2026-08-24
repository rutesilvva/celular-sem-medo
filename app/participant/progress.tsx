import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Card, Header, MetricCard, ProgressBar, SectionTitle, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ParticipantProgressScreen() {
  const router = useRouter();
  const { mission, participantProgress } = useApp();

  return (
    <Screen footer={<ParticipantNav active="progress" />} contentStyle={styles.content}>
      <Header
        title="Meu progresso"
        subtitle="Cada tentativa conta."
        audio
      />

      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.levelIcon}>
            <Ionicons name="ribbon" size={38} color={colors.warning} />
          </View>
          <View style={styles.heroCopy}>
            <AppText variant="small" weight="800" color={colors.primary}>NÍVEL 3</AppText>
            <AppText variant="subheading" weight="800">Exploradora digital</AppText>
            <AppText variant="small" color={colors.textMuted}>
              {mission.completed ? 'Você está cada vez mais independente.' : 'Sua próxima prática já está preparada.'}
            </AppText>
          </View>
        </View>
        <View style={styles.progressHeading}>
          <AppText variant="small" weight="700">Progresso da trilha</AppText>
          <AppText variant="small" weight="800" color={colors.primary}>{participantProgress}%</AppText>
        </View>
        <ProgressBar value={participantProgress} height={12} />
      </Card>

      <View style={styles.metricsRow}>
        <MetricCard icon="checkmark-circle-outline" value={mission.completed ? '4' : '3'} label="Missões concluídas" tone="green" />
        <MetricCard icon="flame-outline" value="3 dias" label="Sequência de prática" tone="yellow" />
      </View>

      <SectionTitle>Conquista mais recente</SectionTitle>
      <Card style={styles.achievementCard}>
        <View style={styles.achievementIcon}>
          <Ionicons name="image-outline" size={31} color={colors.primary} />
        </View>
        <View style={styles.achievementCopy}>
          <View style={styles.achievementHeading}>
            <AppText weight="800">{mission.completed ? 'Enviei uma foto' : 'Reconheci uma mensagem segura'}</AppText>
            <Tag label="Concluída" tone="green" />
          </View>
          <AppText variant="small" color={colors.textMuted}>
            {mission.completed
              ? `Você encontrou o anexo e terminou a missão${mission.usedHelp ? ' com apoio visual' : ' com autonomia'}.`
              : 'Você identificou sinais de segurança antes de responder.'}
          </AppText>
          <View style={styles.achievementMeta}>
            <Ionicons name="trending-up-outline" size={19} color={colors.success} />
            <AppText variant="small" weight="700" color={colors.successText}>
              {mission.completed ? '8% de evolução' : 'Conquista anterior'}
            </AppText>
          </View>
        </View>
      </Card>

      <SectionTitle>Próxima missão recomendada</SectionTitle>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Praticar novamente a missão Enviar uma foto"
        accessibilityHint="Abre os detalhes da missão"
        onPress={() => router.push('/participant/missions')}
        style={({ pressed }) => [styles.nextMission, pressed && styles.pressed]}
      >
        <View style={styles.nextMissionIcon}>
          <Ionicons name="refresh-outline" size={29} color={colors.primary} />
        </View>
        <View style={styles.nextMissionCopy}>
          <AppText weight="800">{mission.completed ? 'Reforce: enviar uma foto' : 'Enviar uma foto'}</AppText>
          <AppText variant="small" color={colors.textMuted}>
            {mission.completed ? 'Uma prática curta ajuda a ganhar confiança.' : 'Sua próxima prática leva cerca de cinco minutos.'}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.primary} />
      </Pressable>

      <AudioButton
        label="Ouvir meu progresso"
        message={`Maria, você concluiu ${mission.completed ? 'quatro' : 'três'} missões, pratica há três dias seguidos e chegou a ${participantProgress} por cento da sua trilha.`}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  heroCard: { backgroundColor: '#FBF8FF', borderColor: colors.primaryMuted, gap: spacing.md },
  heroTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  levelIcon: { alignItems: 'center', backgroundColor: colors.warningSoft, borderRadius: radius.round, height: 68, justifyContent: 'center', width: 68 },
  heroCopy: { flex: 1, gap: spacing.xs },
  progressHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  metricsRow: { flexDirection: 'row', gap: spacing.md },
  achievementCard: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  achievementIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 60, justifyContent: 'center', width: 60 },
  achievementCopy: { flex: 1, gap: spacing.sm },
  achievementHeading: { alignItems: 'flex-start', gap: spacing.sm },
  achievementMeta: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  nextMission: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 104,
    padding: spacing.lg,
  },
  nextMissionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 54, justifyContent: 'center', width: 54 },
  nextMissionCopy: { flex: 1, gap: spacing.xs },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
