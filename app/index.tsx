import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, AudioButton, LogoMark } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace('/login'), 1800);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir Celular Sem Medo"
        accessibilityHint="Leva para a tela de entrada"
        onPress={() => router.replace('/login')}
        style={styles.main}
      >
        <LogoMark wordmark />
        <View style={styles.brandCopy}>
          <AppText variant="body" color={colors.textMuted} style={styles.center}>
            Aprenda no seu ritmo,{`\n`}pratique sem medo.
          </AppText>
        </View>
      </Pressable>
      <AudioButton label="Ouvir apresentação" message="Celular Sem Medo. Aprenda no seu ritmo e pratique sem medo." />
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.dots}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
      <AppText variant="small" color={colors.textMuted} style={styles.center}>Toque para continuar</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingTop: spacing.xxxl },
  main: { alignItems: 'center', gap: spacing.xxl, width: '100%' },
  brandCopy: { gap: spacing.md },
  center: { textAlign: 'center' },
  dots: { flexDirection: 'row', gap: spacing.sm },
  dot: { backgroundColor: colors.primaryMuted, borderRadius: radius.round, height: 8, width: 8 },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  orbOne: { backgroundColor: '#EAD9FF', borderRadius: radius.round, height: 260, left: -110, opacity: 0.9, position: 'absolute', top: -80, width: 260 },
  orbTwo: { backgroundColor: '#F7DDC0', borderRadius: radius.round, bottom: -110, height: 230, opacity: 0.8, position: 'absolute', right: -100, width: 230 },
});
