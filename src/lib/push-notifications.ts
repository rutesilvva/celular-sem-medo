import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerPushDevice } from '@/lib/backend';

export async function enablePushNotifications(): Promise<'enabled' | 'unavailable' | 'denied'> {
  if (Platform.OS === 'web' || !Device.isDevice) return 'unavailable';
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return 'denied';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('help-requests', {
      name: 'Pedidos de ajuda', importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return 'unavailable';
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await registerPushDevice(token, Platform.OS as 'android' | 'ios');
  return 'enabled';
}

export function configurePrivateNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }),
  });
}
