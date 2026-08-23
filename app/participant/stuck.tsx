import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ParticipantStuckScreen() {
  const router = useRouter();
  const { playInstruction, requestMissionHelp } = useApp();

  useEffect(() => {
    requestMissionHelp();
  }, [requestMissionHelp]);

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title="Onde eu travei" onBack={() => router.canGoBack() ? router.back() : router.replace('/participant/simulator')} />

      <View accessibilityRole="header" style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="help-circle" size={52} color={colors.primary} />
        </View>
        <AppText variant="heading" weight="800" style={styles.center}>
          Tudo bem ter dúvida
        </AppText>
        <AppText color={colors.textMuted} style={styles.center}>
          Errar faz parte do treino. Escolha como você quer receber ajuda agora.
        </AppText>
      </View>

      <Card style={styles.contextCard}>
        <View style={styles.contextIcon}>
          <Ionicons name="attach-outline" size={28} color={colors.primary} />
        </View>
        <View style={styles.contextCopy}>
          <AppText variant="small" weight="800" color={colors.primary}>PASSO ATUAL</AppText>
          <AppText weight="800">Encontrar o botão de clipe</AppText>
          <AppText variant="small" color={colors.textMuted}>Ele fica na parte de baixo da conversa de treino.</AppText>
        </View>
      </Card>

      <View style={styles.helpList}>
        <HelpOption
          icon="mic-outline"
          title="Explicar em voz alta"
          description="Conte com suas palavras o que ficou difícil."
          onPress={() => playInstruction('Demonstração: nenhuma fala é gravada. Este recurso aceitará sua explicação por voz em uma versão futura.')}
        />
        <HelpOption
          icon="hand-left-outline"
          title="Mostrar onde tocar"
          description="Veja o botão certo destacado na tela."
          onPress={() => router.push('/participant/guided-help')}
        />
      </View>

      <View style={styles.actions}>
        <Button
          label="Mostrar onde tocar"
          icon="eye-outline"
          accessibilityHint="Abre uma orientação visual do botão de clipe"
          onPress={() => router.push('/participant/guided-help')}
        />
        <Button
          label="Tentar novamente"
          icon="refresh-outline"
          variant="secondary"
          accessibilityHint="Volta para o simulador seguro"
          onPress={() => router.replace('/participant/simulator')}
        />
      </View>
    </Screen>
  );
}

function HelpOption({ icon, title, description, onPress }: {
  icon: 'mic-outline' | 'hand-left-outline';
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Card style={styles.helpOption}>
      <View style={styles.helpOptionIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <View style={styles.helpOptionCopy}>
        <AppText weight="800">{title}</AppText>
        <AppText variant="small" color={colors.textMuted}>{description}</AppText>
      </View>
      <Button label={title} onPress={onPress} variant="soft" style={styles.helpOptionButton} />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.md },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.round,
    height: 92,
    justifyContent: 'center',
    width: 92,
  },
  center: { textAlign: 'center' },
  contextCard: { alignItems: 'center', backgroundColor: colors.primarySoft, flexDirection: 'row', gap: spacing.md },
  contextIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.round, height: 52, justifyContent: 'center', width: 52 },
  contextCopy: { flex: 1, gap: spacing.xs },
  helpList: { gap: spacing.md },
  helpOption: { alignItems: 'center', gap: spacing.md },
  helpOptionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 54, justifyContent: 'center', width: 54 },
  helpOptionCopy: { alignItems: 'center', gap: spacing.xs },
  helpOptionButton: { alignSelf: 'stretch' },
  actions: { gap: spacing.md },
});
