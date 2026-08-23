import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme/tokens';

const steps = [
  { icon: 'chatbubble-ellipses-outline' as const, title: 'Abra uma conversa', copy: 'Use a conversa de treino que aparece na simulação.' },
  { icon: 'attach-outline' as const, title: 'Toque no clipe', copy: 'Ele abre as opções para anexar um arquivo.' },
  { icon: 'image-outline' as const, title: 'Escolha a foto', copy: 'A imagem é apenas de exemplo e não será enviada de verdade.' },
];

export default function ParticipantMissionDetailsScreen() {
  const router = useRouter();
  const { startMission } = useApp();

  const beginTraining = () => {
    startMission();
    router.push('/participant/simulator');
  };

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header
        title="Enviar uma foto"
        subtitle="Missão de treino seguro"
        onBack={() => router.canGoBack() ? router.back() : router.replace('/participant/missions')}
        audio
      />

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="image-outline" size={48} color={colors.primary} />
        </View>
        <Tag label="Recomendada" tone="purple" />
        <AppText variant="heading" weight="800" style={styles.center}>
          Aprenda a escolher e enviar uma foto
        </AppText>
        <AppText color={colors.textMuted} style={styles.center}>
          Você vai praticar em uma conversa simulada. Pode tocar sem medo: nada sairá deste aplicativo.
        </AppText>
      </View>

      <Card style={styles.summaryCard}>
        <SummaryItem icon="time-outline" value="5 min" label="Duração" />
        <View style={styles.verticalDivider} />
        <SummaryItem icon="leaf-outline" value="Fácil" label="Dificuldade" />
        <View style={styles.verticalDivider} />
        <SummaryItem icon="shield-checkmark-outline" value="Seguro" label="Ambiente" />
      </Card>

      <View style={styles.section}>
        <AppText variant="subheading" weight="800">O que você vai fazer</AppText>
        <View style={styles.steps}>
          {steps.map((step, index) => (
            <View key={step.title} style={styles.step}>
              <View style={styles.stepNumber}>
                <AppText weight="800" color={colors.primary}>{index + 1}</AppText>
              </View>
              <View style={styles.stepIcon}>
                <Ionicons name={step.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.stepCopy}>
                <AppText weight="800">{step.title}</AppText>
                <AppText variant="small" color={colors.textMuted}>{step.copy}</AppText>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Card style={styles.reassurance}>
        <Ionicons name="heart" size={28} color={colors.warning} />
        <AppText style={styles.reassuranceCopy}>
          Se ficar em dúvida, você poderá ouvir a instrução, pedir uma dica ou tentar novamente.
        </AppText>
      </Card>

      <View style={styles.actions}>
        <AudioButton
          label="Ouvir explicação"
          message="Nesta missão, você vai abrir uma conversa de treino, tocar no clipe e escolher uma foto. Nada será enviado de verdade."
        />
        <Button
          label="Começar treino"
          icon="play"
          accessibilityHint="Abre o simulador seguro"
          onPress={beginTraining}
        />
      </View>
    </Screen>
  );
}

function SummaryItem({ icon, value, label }: {
  icon: 'time-outline' | 'leaf-outline' | 'shield-checkmark-outline';
  value: string;
  label: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <Ionicons name={icon} size={23} color={colors.primary} />
      <AppText weight="800" style={styles.center}>{value}</AppText>
      <AppText variant="caption" color={colors.textMuted} style={styles.center}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.md },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    height: 94,
    justifyContent: 'center',
    width: 94,
  },
  center: { textAlign: 'center' },
  summaryCard: { alignItems: 'stretch', flexDirection: 'row', paddingHorizontal: spacing.sm },
  summaryItem: { alignItems: 'center', flex: 1, gap: spacing.xs, paddingHorizontal: spacing.xs },
  verticalDivider: { backgroundColor: colors.border, width: 1 },
  section: { gap: spacing.md },
  steps: { gap: spacing.md },
  step: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  stepNumber: { alignItems: 'center', justifyContent: 'center', width: 20 },
  stepIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  stepCopy: { flex: 1, gap: 2 },
  reassurance: { alignItems: 'center', backgroundColor: colors.warningSoft, borderColor: '#F1D68C', flexDirection: 'row', gap: spacing.md },
  reassuranceCopy: { flex: 1 },
  actions: { gap: spacing.md },
});
