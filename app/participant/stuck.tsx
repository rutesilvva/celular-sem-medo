import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useMissionContent } from '@/hooks/useMissionData';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ParticipantStuckScreen() {
  const router = useRouter();
  const { assignmentId } = useLocalSearchParams<{ assignmentId?: string }>();
  const { playInstruction } = useApp();
  const query = useMissionContent(assignmentId ?? null);

  if (query.loading) return <HelpState kind="loading" retry={query.retry} />;
  if (query.error) return <HelpState kind="error" retry={query.retry} />;
  const content = query.data;
  const currentStep = content?.steps[1] ?? content?.steps[0];
  if (!content || !currentStep) return <HelpState kind="empty" retry={query.retry} />;

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title="Onde eu travei" onBack={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/participant/simulator', params: { assignmentId: content.details.assignmentId } })} />

      <Card style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="help-circle" size={52} color={colors.primary} />
        </View>
        <AppText variant="heading" weight="800" style={styles.center}>
          Tudo bem pedir ajuda
        </AppText>
        <AppText color={colors.textMuted} style={styles.center}>
          Você pode ouvir a orientação ou ver onde tocar.
        </AppText>
      </Card>

      <Card style={styles.contextCard}>
        <View style={styles.contextIcon}>
          <Ionicons name="attach-outline" size={28} color={colors.primary} />
        </View>
        <View style={styles.contextCopy}>
          <AppText variant="small" weight="800" color={colors.primary}>PASSO ATUAL</AppText>
          <AppText weight="800">{currentStep.title}</AppText>
          <AppText variant="small" color={colors.textMuted}>{currentStep.hints[0]}</AppText>
        </View>
      </Card>

      <View style={styles.helpList}>
        <HelpOption
          icon="mic-outline"
          title="Explicar em voz alta"
          description="Ouça a instrução e tente novamente."
          onPress={() => playInstruction(currentStep.audioText)}
        />
        <HelpOption
          icon="hand-left-outline"
          title="Mostrar onde tocar"
          description="Veja a área certa para continuar."
          onPress={() => router.push({ pathname: '/participant/guided-help', params: { assignmentId: content.details.assignmentId } })}
        />
      </View>

      <View style={styles.actions}>
        <Button
          label="Mostrar onde tocar"
          icon="eye-outline"
          accessibilityHint="Abre uma orientação visual do botão de clipe"
          onPress={() => router.push({ pathname: '/participant/guided-help', params: { assignmentId: content.details.assignmentId } })}
        />
        <Button
          label="Tentar novamente"
          icon="refresh-outline"
          variant="secondary"
          accessibilityHint="Volta para o simulador seguro"
          onPress={() => router.replace({ pathname: '/participant/simulator', params: { assignmentId: content.details.assignmentId } })}
        />
      </View>
    </Screen>
  );
}

function HelpState({ kind, retry }: { kind: 'loading' | 'error' | 'empty'; retry: () => void }) {
  const router = useRouter();
  return (
    <Screen footer={<ParticipantNav active="missions" />}>
      <Header title="Ajuda" onBack={() => router.replace('/participant/missions')} />
      <DataState kind={kind} title={kind === 'loading' ? 'Carregando ajuda' : 'Ajuda indisponível'} message="Não foi possível acessar este conteúdo publicado." onRetry={retry} />
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
  hero: { alignItems: 'center', backgroundColor: '#FBF5E9', borderColor: '#E9D9A8', gap: spacing.md },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.round,
    height: 92,
    justifyContent: 'center',
    width: 92,
  },
  center: { textAlign: 'center' },
  contextCard: { alignItems: 'center', backgroundColor: '#F6EEFF', borderColor: colors.primaryMuted, flexDirection: 'row', gap: spacing.md },
  contextIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.round, height: 52, justifyContent: 'center', width: 52 },
  contextCopy: { flex: 1, gap: spacing.xs },
  helpList: { gap: spacing.md },
  helpOption: { alignItems: 'center', gap: spacing.md },
  helpOptionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 54, justifyContent: 'center', width: 54 },
  helpOptionCopy: { alignItems: 'center', gap: spacing.xs },
  helpOptionButton: { alignSelf: 'stretch' },
  actions: { gap: spacing.md },
});
