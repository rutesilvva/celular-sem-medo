import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { MissionReview } from './backend';

const key = (ownerId: string) => `review-reminders:v1:${ownerId}`;

export async function scheduleReviewReminders(ownerId: string, reviews: MissionReview[]): Promise<'scheduled' | 'denied' | 'unavailable'> {
  if (Platform.OS === 'web') return 'unavailable';
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return 'denied';
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('learning-reviews', {
    name: 'Revisões de aprendizagem', importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
  await cancelReviewReminders(ownerId);
  const identifiers: string[] = [];
  for (const review of reviews.slice(0, 8)) {
    const due = new Date(review.next_review_at);
    if (due.getTime() <= Date.now()) continue;
    identifiers.push(await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hora de revisar uma habilidade',
        body: review.title,
        data: { route: `/participant/mission-details?assignmentId=${review.assignment_id}` },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: due },
    }));
  }
  await AsyncStorage.setItem(key(ownerId), JSON.stringify(identifiers));
  return identifiers.length ? 'scheduled' : 'unavailable';
}

export async function cancelReviewReminders(ownerId: string) {
  const raw = await AsyncStorage.getItem(key(ownerId));
  const identifiers = raw ? JSON.parse(raw) as string[] : [];
  await Promise.all(identifiers.map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier)));
  await AsyncStorage.removeItem(key(ownerId));
}
