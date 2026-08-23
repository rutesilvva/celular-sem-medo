import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

export default function ParticipantGuidedHelpScreen() {
  const router = useRouter();
  const { finishMission } = useApp();

  const completeWithGuidance = () => {
    finishMission();
    router.push('/participant/result');
  };

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header
        title="Ajuda passo a passo"
        subtitle="Vamos encontrar o botão juntos."
        onBack={() => router.canGoBack() ? router.back() : router.replace('/participant/stuck')}
        audio
      />

      <Card style={styles.encouragement}>
        <Ionicons name="heart" size={28} color={colors.warning} />
        <View style={styles.encouragementCopy}>
          <AppText weight="800">Você está indo bem</AppText>
          <AppText variant="small" color={colors.textMuted}>Veja a indicação e tente de novo quando se sentir pronto.</AppText>
        </View>
      </Card>

      <View accessibilityLabel="Exemplo da parte inferior de uma conversa, com o botão de clipe destacado" style={styles.demo}>
        <View style={styles.demoTop}>
          <Tag label="OLHE AQUI" tone="yellow" />
          <AppText variant="small" weight="800" color={colors.primary}>PARTE DE BAIXO DA CONVERSA</AppText>
        </View>
        <View style={styles.arrowArea}>
          <AppText variant="subheading" weight="800" color={colors.primary} style={styles.center}>
            Este é o botão de clipe
          </AppText>
          <Ionicons name="arrow-down" size={40} color={colors.warning} />
        </View>
        <View style={styles.composer}>
          <View style={styles.highlightRing}>
            <View style={styles.attachButton}>
              <Ionicons name="attach" size={38} color={colors.surface} />
            </View>
          </View>
          <View style={styles.messageField}>
            <AppText variant="small" color={colors.textMuted}>Mensagem</AppText>
          </View>
          <Ionicons name="camera-outline" size={28} color={colors.iconMuted} />
        </View>
      </View>

      <View style={styles.instructions}>
        <Instruction number="1" text="Olhe para a parte de baixo da conversa." />
        <Instruction number="2" text="Encontre o desenho que parece um clipe de papel." />
        <Instruction number="3" text="Toque uma vez no clipe para escolher a foto." />
      </View>

      <View style={styles.actions}>
        <AudioButton
          label="Ouvir novamente"
          message="Olhe a parte de baixo da conversa. O clipe fica do lado esquerdo do campo de mensagem. Toque nele uma vez."
        />
        <Button
          label="Tentar novamente sozinho"
          icon="arrow-forward"
          accessibilityHint="Conclui esta tentativa demonstrativa e mostra o resultado"
          onPress={completeWithGuidance}
        />
        <Button
          label="Voltar ao simulador"
          icon="refresh-outline"
          variant="secondary"
          accessibilityHint="Volta para praticar o passo no simulador"
          onPress={() => router.replace('/participant/simulator')}
        />
      </View>
    </Screen>
  );
}

function Instruction({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.instruction}>
      <View style={styles.number}>
        <AppText weight="800" color={colors.surface}>{number}</AppText>
      </View>
      <AppText style={styles.instructionCopy}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  encouragement: { alignItems: 'center', backgroundColor: colors.warningSoft, borderColor: '#F1D68C', flexDirection: 'row', gap: spacing.md },
  encouragementCopy: { flex: 1, gap: spacing.xs },
  demo: {
    backgroundColor: colors.surface,
    borderColor: colors.primaryMuted,
    borderRadius: radius.xl,
    borderWidth: 2,
    gap: spacing.xl,
    overflow: 'hidden',
    paddingTop: spacing.lg,
    ...shadow,
  },
  demoTop: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  arrowArea: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  center: { textAlign: 'center' },
  composer: { alignItems: 'center', backgroundColor: '#F8F6F9', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  highlightRing: { alignItems: 'center', backgroundColor: colors.warningSoft, borderColor: colors.warning, borderRadius: radius.round, borderWidth: 4, height: 76, justifyContent: 'center', width: 76 },
  attachButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.round, height: 58, justifyContent: 'center', width: 58 },
  messageField: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.round, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
  instructions: { gap: spacing.md },
  instruction: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  number: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.round, height: 38, justifyContent: 'center', width: 38 },
  instructionCopy: { flex: 1 },
  actions: { gap: spacing.md },
});
