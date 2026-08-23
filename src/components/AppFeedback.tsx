import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme/tokens';

export function AppFeedback() {
  const { audioMessage, notice } = useApp();
  const insets = useSafeAreaInsets();
  const [visibleAudioMessage, setVisibleAudioMessage] = useState<string | null>(null);
  const visualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!audioMessage) return;
    if (visualTimer.current) clearTimeout(visualTimer.current);

    setVisibleAudioMessage(audioMessage);
    visualTimer.current = setTimeout(() => {
      setVisibleAudioMessage(null);
      visualTimer.current = null;
    }, 4200);
  }, [audioMessage]);

  useEffect(() => () => {
    if (visualTimer.current) clearTimeout(visualTimer.current);
  }, []);

  const activeAudioMessage = audioMessage ?? visibleAudioMessage;
  const message = activeAudioMessage ?? notice;
  if (!message) return null;

  const isAudio = Boolean(activeAudioMessage);
  const feedbackLabel = isAudio ? 'Áudio de demonstração' : 'Confirmação';

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + spacing.sm }]}>
      <View
        accessibilityLabel={`${feedbackLabel}: ${message}`}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.toast, !isAudio && styles.notice]}
      >
        <Ionicons
          name={isAudio ? 'volume-high' : 'checkmark-circle'}
          size={24}
          color={isAudio ? colors.primary : colors.success}
        />
        <View style={styles.copy}>
          <AppText variant="caption" weight="800" color={isAudio ? colors.primary : colors.success}>
            {feedbackLabel}
          </AppText>
          <AppText variant="small" weight="700">{message}</AppText>
        </View>
        {isAudio ? (
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.wave}>
            <View style={styles.barSmall} />
            <View style={styles.barTall} />
            <View style={styles.barSmall} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', left: spacing.lg, position: 'absolute', right: spacing.lg, zIndex: 100 },
  toast: {
    alignItems: 'flex-start',
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
  copy: { flex: 1, flexShrink: 1, gap: 2 },
  wave: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 2 },
  barSmall: { backgroundColor: colors.primary, borderRadius: 2, height: 8, width: 3 },
  barTall: { backgroundColor: colors.primary, borderRadius: 2, height: 16, width: 3 },
});
