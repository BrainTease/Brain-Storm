import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPreferences {
  courseUpdates: boolean;
  progressReminders: boolean;
  newContent: boolean;
  messages: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  courseUpdates: true,
  progressReminders: true,
  newContent: true,
  messages: true,
};

export class NotificationPreferencesService {
  private readonly STORAGE_KEY = '@notification_preferences';

  async getPreferences(): Promise<NotificationPreferences> {
    const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>) {
    const current = await this.getPreferences();
    const updated = { ...current, ...preferences };
    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }

  async syncWithBackend(userId: string, apiUrl: string) {
    const preferences = await this.getPreferences();
    await fetch(`${apiUrl}/v1/notifications/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, preferences }),
    });
  }
}

export const notificationPreferences = new NotificationPreferencesService();
