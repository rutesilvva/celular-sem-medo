import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Card, Header, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { participantMissions } from '@/data/mock';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ParticipantMissionsScreen() {
  const router = useRouter();
  const { showNotice } = useApp();

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header
        title="Escolher missão"
        subtitle="Pratique uma habilidade por vez."
        audio
      />

      <Card style={styles.introCard}>
        <View style={styles.introIcon}>
          <Ionicons name="flag" size={28} color={colors.primary} />
        </View>
        <View style={styles.introCopy}>
          <AppText weight="800">Qual habilidade você quer treinar?</AppText>
          <AppText variant="small" color={colors.textMuted}>
            Comece pela missão recomendada. As próximas serão liberadas no seu ritmo.
          </AppText>
        </View>
      </Card>

      <View accessibilityRole="list" style={styles.list}>
        {participantMissions.map((mission, index) => {
          const available = mission.id === 'send-photo';
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${mission.title}. ${mission.category}. ${mission.duration}. Dificuldade ${mission.difficulty}. ${mission.status}.`}
              accessibilityHint={available ? 'Abre os detalhes da missão' : 'Mostra que a missão ainda não está disponível'}
              key={mission.id}
              onPress={() => {
                if (available) router.push('/participant/mission-details');
                else showNotice(`${mission.title}: missão disponível em breve`);
              }}
              style={({ pressed }) => [
                styles.mission,
                index === 0 && styles.missionRecommended,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.missionIcon, available ? styles.iconAvailable : styles.iconLocked]}>
                <Ionicons name={mission.icon} size={30} color={available ? colors.primary : colors.iconMuted} />
              </View>
              <View style={styles.missionBody}>
                <View style={styles.missionHeading}>
                  <AppText variant="subheading" weight="800" style={styles.missionTitle}>
                    {mission.title}
                  </AppText>
                  <Tag label={mission.status} tone={available ? 'purple' : 'gray'} />
                </View>
                <AppText variant="small" color={colors.textMuted}>{mission.category}</AppText>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={18} color={colors.iconMuted} />
                    <AppText variant="small" color={colors.textMuted}>{mission.duration}</AppText>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name={available ? 'leaf-outline' : 'lock-closed-outline'} size={18} color={available ? colors.success : colors.iconMuted} />
                    <AppText variant="small" color={colors.textMuted}>{mission.difficulty}</AppText>
                  </View>
                </View>
              </View>
              <Ionicons name={available ? 'chevron-forward' : 'lock-closed'} size={23} color={available ? colors.primary : colors.iconMuted} />
            </Pressable>
          );
        })}
      </View>

      <AudioButton
        label="Ouvir as missões"
        message="A missão recomendada é enviar uma foto. Ela dura cinco minutos e tem dificuldade fácil. As outras missões estarão disponíveis em breve."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  introCard: { alignItems: 'center', backgroundColor: colors.primarySoft, flexDirection: 'row', gap: spacing.md },
  introIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.round,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  introCopy: { flex: 1, gap: spacing.xs },
  list: { gap: spacing.md },
  mission: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 132,
    padding: spacing.lg,
  },
  missionRecommended: { borderColor: colors.primary, borderWidth: 2 },
  missionIcon: { alignItems: 'center', borderRadius: radius.lg, height: 58, justifyContent: 'center', width: 58 },
  iconAvailable: { backgroundColor: colors.primarySoft },
  iconLocked: { backgroundColor: '#EFEEF2' },
  missionBody: { flex: 1, gap: spacing.xs },
  missionHeading: { alignItems: 'flex-start', gap: spacing.sm },
  missionTitle: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.xs },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
