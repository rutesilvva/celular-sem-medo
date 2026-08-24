import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppFeedback } from '@/components/AppFeedback';
import { AppProvider, useApp } from '@/context/AppContext';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppNavigator />
        <StatusBar style="dark" />
        <AppFeedback />
      </AppProvider>
    </SafeAreaProvider>
  );
}

function AppNavigator() {
  const { sessionRole } = useApp();

  return (
    <Stack
      screenOptions={{
        animation: 'fade',
        animationDuration: 200,
        contentStyle: { backgroundColor: colors.background },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="+not-found" />

      <Stack.Protected guard={sessionRole === 'participant'}>
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
      </Stack.Protected>

      <Stack.Protected guard={sessionRole === 'monitor'}>
        <Stack.Screen name="monitor/home" />
        <Stack.Screen name="monitor/participants" />
        <Stack.Screen name="monitor/participant-details" />
        <Stack.Screen name="monitor/missions" />
        <Stack.Screen name="monitor/reports" />
        <Stack.Screen name="monitor/profile" />
      </Stack.Protected>

      <Stack.Protected guard={sessionRole === 'admin'}>
        <Stack.Screen name="admin/home" />
        <Stack.Screen name="admin/users" />
        <Stack.Screen name="admin/classes" />
        <Stack.Screen name="admin/profile" />
      </Stack.Protected>
    </Stack>
  );
}
