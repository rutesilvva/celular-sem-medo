import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { scheduleReviewReminders } from './review-notifications';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 }, AndroidNotificationVisibility: { PRIVATE: 0 }, SchedulableTriggerInputTypes: { DATE: 'date' },
  cancelScheduledNotificationAsync: jest.fn(), getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(), scheduleNotificationAsync: jest.fn(), setNotificationChannelAsync: jest.fn(),
}));

describe('review reminders', () => {
  beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });
  it('schedules only future reviews without personal content', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as never);
    jest.mocked(Notifications.scheduleNotificationAsync).mockResolvedValue('notification-1');
    const future = new Date(Date.now() + 86400000).toISOString();
    await expect(scheduleReviewReminders('student-a', [{ assignment_id: 'a1', title: 'Pix seguro', next_review_at: future, interval_days: 3, is_due: false, review_reason: 'Revisão' }])).resolves.toBe('scheduled');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({ content: expect.objectContaining({ body: 'Pix seguro' }) }));
  });
});
