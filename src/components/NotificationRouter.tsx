import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { configurePrivateNotifications } from '@/lib/push-notifications';

export function NotificationRouter() {
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    configurePrivateNotifications();
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (typeof route === 'string' && (route.startsWith('/participant/help-requests') || route.startsWith('/admin/help-requests') || route.startsWith('/participant/mission-details'))) router.push(route as never);
    });
    return () => subscription.remove();
  }, [router]);
  return null;
}
