import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, Tag } from '@/components/ui';
import { getPublicDemoMission } from '@/features/public-demo/catalog';
import { colors, spacing } from '@/theme/tokens';

export default function PublicMissionDetailsScreen() {
  const router = useRouter();
  const { mission } = useLocalSearchParams<{ mission?: string }>();
  const selected = getPublicDemoMission(mission);
  const explanation = `${selected.details.title}. ${selected.details.summary} Esta é uma simulação segura e nenhuma ação real será realizada.`;

  return <Screen footer={<ParticipantNav active="missions" publicDemo />} contentStyle={styles.content}>
    <Header title="Detalhes da missão" subtitle="A mesma missão disponível para participantes" onBack={() => router.replace({ pathname: '/demo-app', params: { section: 'missions' } })} />
    <Card style={styles.hero}><View style={styles.heroIcon}><Ionicons name={selected.icon} size={42} color={colors.surface} /></View><View style={styles.flex}><AppText variant="heading" weight="800">{selected.details.title}</AppText><AppText>{selected.details.summary}</AppText></View></Card>
    <Card style={styles.reassurance}><Ionicons name="shield-checkmark" size={28} color={colors.success} /><View style={styles.flex}><AppText weight="800">Treino seguro</AppText><AppText variant="small">Esta é uma simulação. Nenhum dado, mensagem, viagem ou dinheiro real será usado.</AppText></View></Card>
    <Button label="Começar passo a passo" icon="play" onPress={() => router.push({ pathname: '/demo-mission', params: { mission: selected.key, restart: String(Date.now()) } })} />
    <Card style={styles.listCard}><View style={styles.titleRow}><AppText variant="subheading" weight="800">O que você vai aprender</AppText><Tag label={`${selected.details.estimatedMinutes} min`} tone="purple" /></View><View style={styles.goals}>{selected.learningGoals.map((goal) => <View key={goal} style={styles.goal}><Ionicons name="checkmark-circle-outline" size={24} color={colors.success} /><AppText style={styles.flex}>{goal}</AppText></View>)}</View></Card>
    <AudioButton label="Ouvir esta explicação" message={explanation} />
    <Button label="Escolher outra missão" variant="secondary" onPress={() => router.replace({ pathname: '/demo-app', params: { section: 'missions' } })} />
  </Screen>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  hero: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, flexDirection: 'row', gap: spacing.md },
  heroIcon: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 999, height: 88, justifyContent: 'center', width: 88 },
  reassurance: { alignItems: 'flex-start', backgroundColor: colors.successSoft, borderColor: colors.success, flexDirection: 'row', gap: spacing.md },
  listCard: { gap: spacing.md },
  titleRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  goals: { gap: spacing.sm },
  goal: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
