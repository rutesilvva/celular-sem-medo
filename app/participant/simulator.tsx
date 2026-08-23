import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, ProgressBar, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

export default function ParticipantSimulatorScreen() {
  const router = useRouter();
  const { finishMission, requestMissionHelp, showNotice } = useApp();

  const completeMission = () => {
    finishMission();
    showNotice('Clipe encontrado. Missão concluída!');
    router.push('/participant/result');
  };

  const openDifficulty = () => {
    requestMissionHelp();
    router.push('/participant/stuck');
  };

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header
        title="Simulador seguro"
        subtitle="Nada será enviado de verdade."
        onBack={() => router.canGoBack() ? router.back() : router.replace('/participant/mission-details')}
        audio
      />

      <Card style={styles.instructionCard}>
        <View style={styles.instructionTop}>
          <View style={styles.stepBadge}>
            <AppText variant="small" weight="800" color={colors.primary}>PASSO 2 DE 3</AppText>
          </View>
          <Tag label="Ambiente seguro" tone="green" />
        </View>
        <AppText variant="subheading" weight="800">
          Toque no clipe para escolher uma foto
        </AppText>
        <AppText color={colors.textMuted}>
          Procure o botão com o desenho de clipe na parte de baixo da conversa.
        </AppText>
        <ProgressBar value={66} />
      </Card>

      <View accessibilityLabel="Conversa de treino com Ana" style={styles.phone}>
        <View style={styles.chatHeader}>
          <View style={styles.avatar}>
            <AppText weight="800" color={colors.primary}>A</AppText>
          </View>
          <View style={styles.chatPerson}>
            <AppText weight="800">Ana · Treino</AppText>
            <AppText variant="caption" color={colors.successText}>Simulação segura</AppText>
          </View>
          <Ionicons name="shield-checkmark" size={24} color={colors.success} />
        </View>

        <View style={styles.chatBody}>
          <View style={styles.receivedBubble}>
            <AppText>Você pode me mandar a foto das flores?</AppText>
            <AppText variant="caption" color={colors.textMuted} style={styles.messageTime}>10:42</AppText>
          </View>

          <View style={styles.emptySpace}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.iconMuted} />
            <AppText variant="small" color={colors.textMuted} style={styles.center}>
              Esta conversa existe só para você praticar.
            </AppText>
          </View>
        </View>

        <View style={styles.composer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Anexar foto, botão de clipe"
            accessibilityHint="Conclui o passo de treino e abre o resultado"
            onPress={completeMission}
            style={({ pressed }) => [styles.attachButton, pressed && styles.pressed]}
          >
            <Ionicons name="attach" size={29} color={colors.primary} />
          </Pressable>
          <View style={styles.messageField}>
            <AppText variant="small" color={colors.textMuted}>
              Mensagem
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir câmera"
            accessibilityHint="Demonstra uma tentativa diferente do passo pedido"
            onPress={openDifficulty}
            style={({ pressed }) => [styles.cameraButton, pressed && styles.pressed]}
          >
            <Ionicons name="camera-outline" size={26} color={colors.iconMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.actions}>
        <AudioButton
          label="Ouvir instrução novamente"
          message="Procure o botão com desenho de clipe na parte de baixo da conversa. Toque nele para escolher uma foto de treino."
        />
        <Button
          label="Preciso de uma dica"
          icon="help-circle-outline"
          variant="soft"
          accessibilityHint="Abre as opções de ajuda"
          onPress={openDifficulty}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  instructionCard: { backgroundColor: colors.primarySoft, gap: spacing.md },
  instructionTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  stepBadge: { backgroundColor: colors.surface, borderRadius: radius.round, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  phone: {
    backgroundColor: colors.surface,
    borderColor: colors.primaryDark,
    borderRadius: radius.xl,
    borderWidth: 3,
    minHeight: 430,
    overflow: 'hidden',
    ...shadow,
  },
  chatHeader: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  avatar: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.round, height: 44, justifyContent: 'center', width: 44 },
  chatPerson: { flex: 1 },
  chatBody: { flex: 1, gap: spacing.xl, justifyContent: 'space-between', padding: spacing.lg },
  receivedBubble: { alignSelf: 'flex-start', backgroundColor: '#EFEEF2', borderRadius: radius.lg, borderTopLeftRadius: radius.sm, maxWidth: '86%', padding: spacing.md },
  messageTime: { alignSelf: 'flex-end', marginTop: spacing.xs },
  emptySpace: { alignItems: 'center', gap: spacing.sm, justifyContent: 'center', minHeight: 165, paddingHorizontal: spacing.xxxl },
  center: { textAlign: 'center' },
  composer: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  attachButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: radius.round,
    borderWidth: 2,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  messageField: { backgroundColor: '#F4F2F6', borderRadius: radius.round, flex: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
  cameraButton: { alignItems: 'center', borderRadius: radius.round, height: 48, justifyContent: 'center', width: 48 },
  actions: { gap: spacing.md },
  pressed: { opacity: 0.68, transform: [{ scale: 0.96 }] },
});
