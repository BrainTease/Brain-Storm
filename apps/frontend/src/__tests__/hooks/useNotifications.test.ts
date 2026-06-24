import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/store/auth.store';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    connected: true,
    on: vi.fn((event: string, handler: any) => {
      // Store handlers for later invocation
      mockSocket._handlers = mockSocket._handlers || {};
      mockSocket._handlers[event] = handler;
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };

  return {
    io: vi.fn(() => mockSocket),
  };
});

// Mock auth store
vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

describe('useNotifications', () => {
  let mockAuthStore: any;
  let mockSocket: any;

  beforeEach(() => {
    // Setup mock socket
    const { io } = require('socket.io-client');
    mockSocket = io.mock.results[0].value;
    mockSocket._handlers = {};
    vi.clearAllMocks();

    // Setup mock auth store
    mockAuthStore = vi.fn((selector) => {
      const state = { token: 'test-token' };
      return selector(state);
    });
    (useAuthStore as any).mockImplementation(mockAuthStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty notifications', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toEqual([]);
    expect(result.current.visibleNotifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should load notifications on socket init event', async () => {
    const { result } = renderHook(() => useNotifications());

    const initialNotifications = [
      { id: '1', type: 'enrollment' as const, message: 'Enrolled', isRead: false, createdAt: '2024-01-01' },
      { id: '2', type: 'credential' as const, message: 'Credential issued', isRead: true, createdAt: '2024-01-02' },
    ];

    act(() => {
      mockSocket._handlers['notifications:init']?.(initialNotifications);
    });

    await waitFor(() => {
      expect(result.current.notifications).toEqual(initialNotifications);
    });
  });

  it('should add new notification to the beginning', async () => {
    const { result } = renderHook(() => useNotifications());

    const newNotification = { id: '3', type: 'progress' as const, message: 'Progress update', isRead: false, createdAt: '2024-01-03' };

    act(() => {
      mockSocket._handlers['notification']?.(newNotification);
    });

    await waitFor(() => {
      expect(result.current.notifications[0]).toEqual(newNotification);
    });
  });

  it('should mark notification as read', async () => {
    const { result } = renderHook(() => useNotifications());

    const notification = { id: '1', type: 'enrollment' as const, message: 'Enrolled', isRead: false, createdAt: '2024-01-01' };

    act(() => {
      mockSocket._handlers['notifications:init']?.([notification]);
    });

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(1);
    });

    act(() => {
      result.current.markAsRead(['1']);
    });

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('notifications:markRead', ['1']);
    });
  });

  it('should mark notification as unread', async () => {
    const { result } = renderHook(() => useNotifications());

    const notification = { id: '1', type: 'enrollment' as const, message: 'Enrolled', isRead: true, createdAt: '2024-01-01' };

    act(() => {
      mockSocket._handlers['notifications:init']?.([notification]);
    });

    act(() => {
      result.current.markAsUnread(['1']);
    });

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('notifications:markUnread', ['1']);
    });
  });

  it('should handle mark all as read', async () => {
    const { result } = renderHook(() => useNotifications());

    const notifications = [
      { id: '1', type: 'enrollment' as const, message: 'Enrolled', isRead: false, createdAt: '2024-01-01' },
      { id: '2', type: 'credential' as const, message: 'Credential issued', isRead: false, createdAt: '2024-01-02' },
    ];

    act(() => {
      mockSocket._handlers['notifications:init']?.(notifications);
    });

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(2);
    });

    act(() => {
      result.current.markAllRead();
    });

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('notifications:markRead', ['1', '2']);
    });
  });

  it('should filter notifications by preferences', async () => {
    const { result } = renderHook(() => useNotifications());

    const notifications = [
      { id: '1', type: 'enrollment' as const, message: 'Enrolled', isRead: false, createdAt: '2024-01-01' },
      { id: '2', type: 'credential' as const, message: 'Credential issued', isRead: false, createdAt: '2024-01-02' },
    ];

    act(() => {
      mockSocket._handlers['notifications:init']?.(notifications);
    });

    await waitFor(() => {
      expect(result.current.visibleNotifications).toHaveLength(2);
    });

    act(() => {
      result.current.updatePreferences({ enrollment: false });
    });

    await waitFor(() => {
      expect(result.current.visibleNotifications).toHaveLength(1);
      expect(result.current.visibleNotifications[0].type).toBe('credential');
    });
  });

  it('should sync read state with server', async () => {
    const { result } = renderHook(() => useNotifications());

    const notifications = [
      { id: '1', type: 'enrollment' as const, message: 'Enrolled', isRead: false, createdAt: '2024-01-01' },
      { id: '2', type: 'credential' as const, message: 'Credential issued', isRead: false, createdAt: '2024-01-02' },
    ];

    act(() => {
      mockSocket._handlers['notifications:init']?.(notifications);
    });

    // Server confirms read
    act(() => {
      mockSocket._handlers['notifications:read']?.(['1']);
    });

    await waitFor(() => {
      expect(result.current.notifications[0]).toMatchObject({ id: '1', isRead: true });
    });
  });

  it('should calculate unread count correctly', async () => {
    const { result } = renderHook(() => useNotifications());

    const notifications = [
      { id: '1', type: 'enrollment' as const, message: 'Enrolled', isRead: false, createdAt: '2024-01-01' },
      { id: '2', type: 'credential' as const, message: 'Credential issued', isRead: true, createdAt: '2024-01-02' },
      { id: '3', type: 'progress' as const, message: 'Progress update', isRead: false, createdAt: '2024-01-03' },
    ];

    act(() => {
      mockSocket._handlers['notifications:init']?.(notifications);
    });

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(2);
    });
  });

  it('should update preferences and sync with server', async () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.updatePreferences({ enrollment: false, progress: false });
    });

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'notifications:updatePreferences',
        expect.objectContaining({
          enrollment: false,
          progress: false,
        })
      );
    });
  });

  it('should handle connection without token', () => {
    mockAuthStore.mockImplementation((selector) => {
      const state = { token: undefined };
      return selector(state);
    });

    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toEqual([]);
  });

  it('should disconnect socket on unmount', () => {
    const { unmount } = renderHook(() => useNotifications());

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
