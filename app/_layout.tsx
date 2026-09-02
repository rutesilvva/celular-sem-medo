import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppFeedback } from '@/components/AppFeedback';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { NotificationRouter } from '@/components/NotificationRouter';
import { OfflineSyncManager } from '@/components/OfflineSyncManager';
import { ObservabilityManager } from '@/components/ObservabilityManager';
import { AppProvider, useApp } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { canAccessRole } from '@/features/auth/authorization';
import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';

const bootDockIcons = [
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

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <AppProvider>
            <AppNavigator />
            <NotificationRouter />
            <OfflineSyncManager />
            <ObservabilityManager />
            <StatusBar style="dark" />
            <AppFeedback />
          </AppProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

function AppNavigator() {
  const { sessionRole, status } = useAuth();
  const { preferences, preferencesReady } = useApp();

  if (status === 'bootstrapping' || status === 'refreshing' || (status === 'authenticated' && !preferencesReady)) {
    return (
      <View accessibilityLabel="Verificando sessão segura" style={styles.boot}>
        <View style={styles.desktopPage}>
          <View style={styles.topBar}>
            <View style={styles.topLeft}>
              <View style={styles.dotRed} />
              <View style={styles.dotYellow} />
              <View style={styles.dotGreen} />
            </View>

            <View style={styles.menuRow}>
              <AppText variant="small" color="#D8D8D8">API Keys</AppText>
              <AppText variant="small" color="#D8D8D8">|</AppText>
              <AppText variant="small" color="#D8D8D8">Settings</AppText>
              <AppText variant="small" color="#D8D8D8">|</AppText>
              <AppText variant="small" color="#D8D8D8">Celular Sem Medo</AppText>
            </View>

            <View style={styles.urlChip}>
              <View style={styles.globeDot} />
              <AppText variant="small" color="#F2F2F2">localhost:8081</AppText>
            </View>
          </View>

          <View style={styles.centerPanel}>
            <View style={styles.loaderCard}>
              <ActivityIndicator color={colors.primary} size="large" />
              <AppText variant="subheading" weight="800" color="#F5F5F5">Verificando sessão segura</AppText>
              <View style={styles.progressBar}>
                <View style={styles.progressBarFill} />
              </View>
            </View>
          </View>

          <View style={styles.dock}>
            {bootDockIcons.map((icon, index) => (
              <View key={`${icon.label}-${index}`} style={styles.iconWrap}>
                <View style={[styles.appIcon, { backgroundColor: icon.color }]} />
              </View>
            ))}
            <View style={styles.moreIconWrap}>
              <View style={styles.moreIcon} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        animation: preferences.reduceMotion ? 'none' : 'fade',
        animationDuration: 200,
        contentStyle: { backgroundColor: colors.background },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="demo" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="+not-found" />

      <Stack.Protected guard={canAccessRole(status, sessionRole, 'participant')}>
        <Stack.Screen name="participant/welcome" />
        <Stack.Screen name="participant/accessibility" />
        <Stack.Screen name="participant/home" />
        <Stack.Screen name="participant/missions" />
        <Stack.Screen name="participant/mission-details" />
        <Stack.Screen name="participant/simulator" />
        <Stack.Screen name="participant/stuck" />
        <Stack.Screen name="participant/guided-help" />
        <Stack.Screen name="participant/result" />
        <Stack.Screen name="participant/progress" />
        <Stack.Screen name="participant/profile" />
        <Stack.Screen name="participant/help-requests" />
        <Stack.Screen name="participant/offline-activities" />
      </Stack.Protected>

      <Stack.Protected guard={canAccessRole(status, sessionRole, 'admin')}>
        <Stack.Screen name="admin/home" />
        <Stack.Screen name="admin/users" />
        <Stack.Screen name="admin/classes" />
        <Stack.Screen name="admin/profile" />
        <Stack.Screen name="admin/participants" />
        <Stack.Screen name="admin/participant-details" />
        <Stack.Screen name="admin/missions" />
        <Stack.Screen name="admin/reports" />
        <Stack.Screen name="admin/help-requests" />
        <Stack.Screen name="admin/impact" />
        <Stack.Screen name="admin/workshop" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  boot: {
    backgroundColor: '#000000',
    flex: 1,
  },
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
  centerPanel: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loaderCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    width: 320,
  },
  progressBar: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: '100%',
    width: '60%',
  },
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
