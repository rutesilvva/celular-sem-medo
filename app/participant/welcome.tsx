import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, LogoMark } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ParticipantWelcomeScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const firstName = currentUser?.name.split(/\s+/)[0] || 'Olá';

  return (
    <Screen contentStyle={styles.content}>
      <View accessibilityRole="header" style={styles.hero}>
        <LogoMark />
        <View style={styles.copy}>
          <AppText variant="title" weight="800" color={colors.primary} style={styles.center}>
            Olá, {firstName}!
          </AppText>
          <AppText variant="subheading" weight="700" style={styles.center}>
            Este é um lugar seguro para aprender.
          </AppText>
          <AppText color={colors.textMuted} style={styles.center}>
            Aqui você pode praticar quantas vezes quiser, no seu ritmo e sem medo de errar.
          </AppText>
        </View>
      </View>

      <Card style={styles.promiseCard}>
        <View style={styles.promiseIcon}>
          <Ionicons name="shield-checkmark" size={30} color={colors.success} />
        </View>
        <View style={styles.promiseCopy}>
          <AppText weight="800">Nada aqui é enviado de verdade</AppText>
          <AppText variant="small" color={colors.textMuted}>
            As atividades são simulações. Você pode testar, voltar e pedir ajuda quando precisar.
          </AppText>
        </View>
      </Card>

      <View style={styles.actions}>
        <AudioButton
          label="Ouvir boas-vindas"
          message={`Olá, ${firstName}. Este é um lugar seguro para aprender. Você pode praticar no seu ritmo e sem medo de errar.`}
        />
        <Button
          label="Começar"
          icon="arrow-forward"
          accessibilityHint="Abre as opções de acessibilidade"
          onPress={() => router.push('/participant/accessibility')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', paddingTop: spacing.xxxl },
  hero: { alignItems: 'center', gap: spacing.xxl },
  copy: { gap: spacing.md },
  center: { textAlign: 'center' },
  promiseCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  promiseIcon: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.round,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  promiseCopy: { flex: 1, gap: spacing.xs },
  actions: { gap: spacing.md },
});
