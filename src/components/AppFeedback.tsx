import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme/tokens';

export function AppFeedback() {
  const { audioError, audioMessage, audioStatus, notice, pauseInstruction, repeatInstruction, resumeInstruction, stopInstruction } = useApp();
  const insets = useSafeAreaInsets();
  const message = audioError ?? audioMessage ?? notice;
  if (!message) return null;

  const isAudio = Boolean(audioMessage);
  const feedbackLabel = isAudio ? 'Instrução em áudio' : 'Confirmação';

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + spacing.sm }]}>
      <View
        accessibilityLabel={`${feedbackLabel}: ${message}`}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.toast, !isAudio && styles.notice]}
      >
        <View style={[styles.iconWrap, isAudio && styles.iconAudio]}>
          <Ionicons
            name={isAudio ? 'volume-high' : 'checkmark-circle'}
            size={22}
            color={isAudio ? colors.primary : colors.success}
          />
        </View>
        <View style={styles.copy}>
          <AppText variant="caption" weight="800" color={isAudio ? colors.primary : colors.success}>
            {feedbackLabel}
          </AppText>
          <AppText variant="small" weight="700" numberOfLines={2}>{message}</AppText>
        </View>
        {isAudio ? (
          <View style={styles.controls}>
            {audioStatus === 'paused' ? (
              <AudioControl label="Continuar áudio" icon="play" onPress={resumeInstruction} />
            ) : (
              <AudioControl label="Pausar áudio" icon="pause" onPress={pauseInstruction} disabled={audioStatus !== 'speaking'} />
            )}
            <AudioControl label="Repetir áudio" icon="refresh" onPress={repeatInstruction} />
            <AudioControl label="Parar áudio" icon="stop" onPress={stopInstruction} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function AudioControl({ label, icon, onPress, disabled = false }: {
  label: string;
  icon: 'pause' | 'play' | 'refresh' | 'stop';
  onPress: () => void;
  disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={styles.control}>
    <Ionicons name={icon} size={19} color={disabled ? colors.iconMuted : colors.primary} />
  </Pressable>;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', left: spacing.lg, position: 'absolute', right: spacing.lg, zIndex: 100 },
  toast: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: radius.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    maxWidth: 420,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  notice: { backgroundColor: colors.successSoft, borderColor: '#BEE8CE' },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#F4E8FF',
    borderRadius: radius.round,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  iconAudio: { backgroundColor: '#E9F2FF' },
  copy: { flex: 1, flexShrink: 1, gap: 2 },
  controls: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  control: { alignItems: 'center', justifyContent: 'center', minHeight: 40, minWidth: 36 },
});
