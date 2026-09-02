import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, LogoMark } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ParticipantWelcomeScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
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
            Você está pronto(a) para aprender no seu ritmo.
          </AppText>
          <AppText color={colors.textMuted} style={styles.center}>
            Aqui você pratica com segurança, revisa quando quiser e pede ajuda sem medo.
          </AppText>
        </View>
      </View>

      <Card style={styles.promiseCard}>
        <View style={styles.promiseIcon}>
          <Ionicons name="shield-checkmark" size={30} color={colors.success} />
        </View>
        <View style={styles.promiseCopy}>
          <AppText weight="800">Ambiente seguro para praticar</AppText>
          <AppText variant="small" color={colors.textMuted}>
            As tarefas são simuladas e não envolvem riscos. Você pode repetir, voltar e continuar quando quiser.
          </AppText>
        </View>
      </Card>

      <Card style={styles.benefitsCard}>
        <AppText variant="subheading" weight="800">O que você vai encontrar</AppText>
        <View style={styles.benefitsList}>
          <BenefitRow icon="volume-high-outline" label="Instruções em áudio e texto" />
          <BenefitRow icon="repeat-outline" label="Repetição tranquila de cada etapa" />
          <BenefitRow icon="help-circle-outline" label="Apoio sempre que precisar" />
        </View>
      </Card>

      <View style={styles.actions}>
        <AudioButton
          label="Ouvir boas-vindas"
          message={`Olá, ${firstName}. Você pode aprender sempre no seu ritmo. Aqui, as instruções aparecem em áudio e texto, e você pode repetir cada etapa quando quiser.`}
        />
        <Button
          label="Começar"
          icon="arrow-forward"
          accessibilityHint="Abre as opções de acessibilidade e personalização"
          onPress={() => router.push('/participant/accessibility')}
        />
      </View>
    </Screen>
  );
}

function BenefitRow({ icon, label }: { icon: 'volume-high-outline' | 'repeat-outline' | 'help-circle-outline'; label: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <AppText variant="small" color={colors.textMuted}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', paddingTop: spacing.xxxl },
  hero: { alignItems: 'center', gap: spacing.xxl },
  copy: { gap: spacing.md },
  center: { textAlign: 'center' },
  promiseCard: { alignItems: 'center', backgroundColor: '#F7F1FF', borderColor: colors.primaryMuted, flexDirection: 'row', gap: spacing.md },
  promiseIcon: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.round,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  promiseCopy: { flex: 1, gap: spacing.xs },
  benefitsCard: { gap: spacing.md },
  benefitsList: { gap: spacing.sm },
  benefitRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  benefitIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  actions: { gap: spacing.md },
});
