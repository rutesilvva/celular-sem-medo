import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Tag } from '@/components/ui';
import { getPublicDemoMission } from '@/features/public-demo/catalog';
import { recordPublicDemoCompletion } from '@/features/public-demo/progress';
import { colors, radius, spacing } from '@/theme/tokens';

export default function PublicMissionResultScreen() {
  const router = useRouter();
  const { mission, completion } = useLocalSearchParams<{ mission?: string; completion?: string }>();
  const selected = getPublicDemoMission(mission);
  const review = selected.learningGoals.join('; ');
  useEffect(() => { void recordPublicDemoCompletion(selected.key); }, [selected.key]);

  return (
    <Screen footer={<ParticipantNav active="progress" publicDemo />} contentStyle={styles.content}>
      <Card style={styles.hero}>
        <View style={styles.successRing}><Ionicons name="checkmark" size={58} color={colors.surface} /></View>
        <AppText variant="title" weight="800" color={colors.primary} style={styles.center}>Parabéns! Você concluiu esta missão.</AppText>
        <AppText color={colors.textMuted} style={styles.center}>
          {completion === 'with_help'
            ? 'Você recebeu ajuda e concluiu todos os passos da prática.'
            : completion === 'with_hint'
              ? 'Você usou uma dica e concluiu todos os passos da prática.'
              : 'Você concluiu todos os passos da prática.'}
        </AppText>
      </Card>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryTitle}><View style={styles.missionIcon}><Ionicons name={selected.icon} size={30} color={colors.primary} /></View><View style={styles.flex}><Tag label="REVISÃO FINAL" tone="green" /><AppText variant="subheading" weight="800">O que você praticou</AppText></View></View>
        <View style={styles.goalList}>{selected.learningGoals.map((goal) => <View key={goal} style={styles.goal}><Ionicons name="checkmark-circle" size={24} color={colors.success} /><AppText style={styles.flex}>{goal}</AppText></View>)}</View>
      </Card>

      <Card style={styles.disclosure}><Ionicons name="shield-checkmark-outline" size={27} color={colors.success} /><AppText style={styles.flex}>Conclusão apenas nesta demonstração. Nenhum resultado foi enviado ao servidor e nenhum dado pessoal foi usado.</AppText></Card>

      <Button label="Praticar novamente" icon="refresh-outline" onPress={() => router.replace({ pathname: '/demo-mission', params: { mission: selected.key, restart: String(Date.now()) } })} />
      <Button label="Escolher outra missão" icon="flag-outline" variant="secondary" onPress={() => router.replace({ pathname: '/demo-app', params: { section: 'missions' } })} />
      <Button label="Compartilhar conquista" icon="share-social-outline" variant="soft" onPress={() => void Share.share({ message: `Hoje pratiquei “${selected.details.title}” com o Celular Sem Medo.` })} />
      <AudioButton label="Ouvir esta revisão" message={`Parabéns. Você concluiu a missão ${selected.details.title}. Você praticou: ${review}.`} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, justifyContent: 'center', paddingTop: spacing.xxxl },
  hero: { alignItems: 'center', backgroundColor: '#F3F8F2', borderColor: '#CFEAD8', gap: spacing.md },
  successRing: { alignItems: 'center', backgroundColor: colors.success, borderColor: colors.successSoft, borderRadius: radius.round, borderWidth: 10, height: 112, justifyContent: 'center', width: 112 },
  center: { textAlign: 'center' },
  summaryCard: { gap: spacing.lg },
  summaryTitle: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  missionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 58, justifyContent: 'center', width: 58 },
  goalList: { gap: spacing.sm },
  goal: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  disclosure: { alignItems: 'flex-start', backgroundColor: colors.successSoft, borderColor: colors.success, flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
