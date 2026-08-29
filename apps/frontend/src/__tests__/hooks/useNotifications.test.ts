/**
 * Unit tests for useNotifications hook
 * Tests toast notification behavior and management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from '@/hooks/useNotifications';

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty notifications', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should add a notification', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification({
        id: '1',
        type: 'success',
        message: 'Test notification',
        timestamp: new Date(),
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject({
      id: '1',
      type: 'success',
      message: 'Test notification',
    });
  });

  it('should mark notification as read', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification({
        id: '1',
        type: 'info',
        message: 'Unread notification',
        timestamp: new Date(),
        read: false,
      });
    });

    expect(result.current.unreadCount).toBe(1);

    act(() => {
      result.current.markAsRead('1');
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications[0].read).toBe(true);
  });

  it('should remove a notification', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification({
        id: '1',
        type: 'warning',
        message: 'Warning message',
        timestamp: new Date(),
      });
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      result.current.removeNotification('1');
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should clear all notifications', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification({
        id: '1',
        type: 'success',
        message: 'First notification',
        timestamp: new Date(),
      });
      result.current.addNotification({
        id: '2',
        type: 'error',
        message: 'Second notification',
        timestamp: new Date(),
      });
    });

    expect(result.current.notifications).toHaveLength(2);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should handle multiple notification types', () => {
    const { result } = renderHook(() => useNotifications());

    const types = ['success', 'error', 'warning', 'info'] as const;

    act(() => {
      types.forEach((type, index) => {
        result.current.addNotification({
          id: String(index),
          type,
          message: `${type} message`,
          timestamp: new Date(),
        });
      });
    });

    expect(result.current.notifications).toHaveLength(4);
    types.forEach((type, index) => {
      expect(result.current.notifications[index].type).toBe(type);
    });
  });

  it('should count unread notifications correctly', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification({
        id: '1',
        type: 'info',
        message: 'Notification 1',
        timestamp: new Date(),
        read: false,
      });
      result.current.addNotification({
        id: '2',
        type: 'info',
        message: 'Notification 2',
        timestamp: new Date(),
        read: false,
      });
      result.current.addNotification({
        id: '3',
        type: 'info',
        message: 'Notification 3',
        timestamp: new Date(),
        read: true,
      });
    });

    expect(result.current.unreadCount).toBe(2);
  });

  it('should mark all as read', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification({
        id: '1',
        type: 'info',
        message: 'Notification 1',
        timestamp: new Date(),
        read: false,
      });
      result.current.addNotification({
        id: '2',
        type: 'info',
        message: 'Notification 2',
        timestamp: new Date(),
        read: false,
      });
    });

    expect(result.current.unreadCount).toBe(2);

    act(() => {
      result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(0);
    result.current.notifications.forEach((notification) => {
      expect(notification.read).toBe(true);
    });
  });

  it('should handle notification with action', () => {
    const { result } = renderHook(() => useNotifications());
    const mockAction = vi.fn();

    act(() => {
      result.current.addNotification({
        id: '1',
        type: 'info',
        message: 'Notification with action',
        timestamp: new Date(),
        action: {
          label: 'Click me',
          onClick: mockAction,
        },
      });
    });

    const notification = result.current.notifications[0];
    expect(notification.action).toBeDefined();
    expect(notification.action?.label).toBe('Click me');

    act(() => {
      notification.action?.onClick();
    });

    expect(mockAction).toHaveBeenCalledOnce();
  });

  it('should auto-dismiss notification after timeout', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification({
        id: '1',
        type: 'success',
        message: 'Auto-dismiss notification',
        timestamp: new Date(),
        autoDismiss: true,
        duration: 3000,
      });
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(0);
    });

    vi.useRealTimers();
  });

  it('should handle notification priority ordering', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification({
        id: '1',
        type: 'info',
        message: 'Low priority',
        timestamp: new Date(),
        priority: 'low',
      });
      result.current.addNotification({
        id: '2',
        type: 'error',
        message: 'High priority',
        timestamp: new Date(),
        priority: 'high',
      });
      result.current.addNotification({
        id: '3',
        type: 'warning',
        message: 'Medium priority',
        timestamp: new Date(),
        priority: 'medium',
      });
    });

    // Notifications should be ordered by priority (high, medium, low)
    expect(result.current.notifications[0].priority).toBe('high');
    expect(result.current.notifications[1].priority).toBe('medium');
    expect(result.current.notifications[2].priority).toBe('low');
  });
});
