import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';

export type NotificationType =
  | 'enrollment'
  | 'progress'
  | 'credential'
  | 'token_reward'
  | 'course_update'
  | 'achievement'
  | 'message'
  | 'general';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
  /** Optional deep-link URL the user should be navigated to on click */
  actionUrl?: string;
}

export interface NotificationPreferences {
  enrollment: boolean;
  progress: boolean;
  credential: boolean;
  token_reward: boolean;
  course_update: boolean;
  achievement: boolean;
  message: boolean;
  general: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enrollment: true,
  progress: true,
  credential: true,
  token_reward: true,
  course_update: true,
  achievement: true,
  message: true,
  general: true,
};

const PREFS_STORAGE_KEY = 'brainstorm-notification-prefs';

export const TYPE_ICONS: Record<NotificationType, string> = {
  enrollment: '📚',
  progress: '📈',
  credential: '🏆',
  token_reward: '🪙',
  course_update: '🔄',
  achievement: '🎖️',
  message: '💬',
  general: '🔔',
};

export const TYPE_LABELS: Record<NotificationType, string> = {
  enrollment: 'Enrollment',
  progress: 'Progress',
  credential: 'Credential',
  token_reward: 'Token Reward',
  course_update: 'Course Update',
  achievement: 'Achievement',
  message: 'Message',
  general: 'General',
};

function loadPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem(PREFS_STORAGE_KEY);
    if (stored) return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return DEFAULT_PREFERENCES;
}

function savePreferences(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function useNotifications() {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [preferences, setPreferencesState] = useState<NotificationPreferences>(loadPreferences);

  useEffect(() => {
    if (!token) return;

    const socket = io(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/notifications`,
      { auth: { token }, transports: ['websocket'] }
    );
    socketRef.current = socket;

    // Load existing notifications on connect
    socket.on('notifications:init', (initial: AppNotification[]) => {
      setNotifications(initial);
    });

    // New incoming notification
    socket.on('notification', (n: AppNotification) => {
      setNotifications((prev) => [n, ...prev]);
    });

    // Server confirms mark-as-read
    socket.on('notifications:read', (ids: string[]) => {
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
      );
    });

    // Server confirms mark-as-unread
    socket.on('notifications:unread', (ids: string[]) => {
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: false } : n))
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const markAsRead = useCallback((ids: string[]) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
    );
    socketRef.current?.emit('notifications:markRead', ids);
  }, []);

  const markAsUnread = useCallback((ids: string[]) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: false } : n))
    );
    socketRef.current?.emit('notifications:markUnread', ids);
  }, []);

  const markAllRead = useCallback(() => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length) markAsRead(unreadIds);
  }, [notifications, markAsRead]);

  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    setPreferencesState((prev) => {
      const next = { ...prev, ...updates };
      savePreferences(next);
      // Notify server so it can suppress server-side push
      socketRef.current?.emit('notifications:updatePreferences', next);
      return next;
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  /** Notifications filtered by user preferences */
  const visibleNotifications = notifications.filter((n) => preferences[n.type] !== false);

  return {
    notifications,
    visibleNotifications,
    unreadCount,
    markAsRead,
    markAsUnread,
    markAllRead,
    preferences,
    updatePreferences,
  };
}
