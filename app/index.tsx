import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { radius } from '@/theme/tokens';

const dockIcons = [
  { label: 'Finder', color: '#F7B267' },
  { label: 'Safari', color: '#5AE4A8' },
  { label: 'Mail', color: '#F26B6B' },
  { label: 'App Store', color: '#7FB3FF' },
  { label: 'Notes', color: '#FFD166' },
  { label: 'Calendar', color: '#BD9DF8' },
  { label: 'Music', color: '#4EC8FF' },
  { label: 'Settings', color: '#B5B5B5' },
  { label: 'Trash', color: '#D7D7D7' },
];

export default function SplashScreen() {
  const router = useRouter();
  const demoMode = isDemoModeEnabled();

  useEffect(() => {
    if (demoMode) return;
    const timer = setTimeout(() => router.replace('/login'), 1800);
    return () => clearTimeout(timer);
  }, [demoMode, router]);

  if (demoMode) return <Redirect href="/demo" />;

  return (
    <Screen scroll={false} contentStyle={styles.desktopPage}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <View style={styles.dotRed} />
          <View style={styles.dotYellow} />
          <View style={styles.dotGreen} />
        </View>

        <View style={styles.menuRow}>
          <AppText variant="small" color="#D8D8D8">Celular Sem Medo · aprender com segurança</AppText>
        </View>

        <View style={styles.urlChip}>
          <View style={styles.globeDot} />
          <AppText variant="small" color="#F2F2F2">Celular Sem Medo</AppText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir Celular Sem Medo"
        accessibilityHint="Leva para a tela de entrada"
        onPress={() => router.replace('/login')}
        style={styles.emptyDesktop}
      />

      <View style={styles.dock}>
        {dockIcons.map((icon, index) => (
          <View key={`${icon.label}-${index}`} style={styles.iconWrap}>
            <View style={[styles.appIcon, { backgroundColor: icon.color }]} />
          </View>
        ))}
        <View style={styles.moreIconWrap}>
          <View style={styles.moreIcon} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  desktopPage: {
    backgroundColor: '#000000',
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.92)',
    borderBottomColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 36,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    width: '100%',
  },
  topLeft: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  dotRed: { backgroundColor: '#FF5F57', borderRadius: radius.round, height: 10, width: 10 },
  dotYellow: { backgroundColor: '#FFBD2F', borderRadius: radius.round, height: 10, width: 10 },
  dotGreen: { backgroundColor: '#28C840', borderRadius: radius.round, height: 10, width: 10 },
  menuRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  urlChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  globeDot: { backgroundColor: '#34C759', borderRadius: radius.round, height: 9, width: 9 },
  emptyDesktop: { flex: 1, width: '100%' },
  dock: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.82)',
    borderTopColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    width: '100%',
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },
  appIcon: { borderRadius: 12, height: 30, width: 30 },
  moreIconWrap: { alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  moreIcon: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    height: 30,
    width: 30,
  },
});
