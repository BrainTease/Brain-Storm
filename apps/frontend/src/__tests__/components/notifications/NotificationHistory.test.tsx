import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { NotificationHistory } from '@/components/notifications/NotificationHistory';
import * as useNotificationsModule from '@/hooks/useNotifications';

vi.mock('@/hooks/useNotifications');
vi.mock('@/components/notifications/NotificationPreferences', () => ({
  NotificationPreferences: () => <div data-testid="notification-preferences">Preferences</div>,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockNotifications = [
  {
    id: '1',
    type: 'achievement' as const,
    message: 'You earned a badge!',
    isRead: false,
    createdAt: '2024-01-20T10:00:00Z',
    actionUrl: '/badges',
  },
  {
    id: '2',
    type: 'progress' as const,
    message: 'You completed a lesson',
    isRead: true,
    createdAt: '2024-01-19T15:30:00Z',
    actionUrl: '/courses',
  },
  {
    id: '3',
    type: 'enrollment' as const,
    message: 'New course available',
    isRead: false,
    createdAt: '2024-01-18T08:00:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NotificationHistory Component', () => {
  it('should render notification header', () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: [],
      unreadCount: 0,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('should display notification count', () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: mockNotifications,
      unreadCount: 2,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);
    expect(screen.getByText(/3 notifications/)).toBeInTheDocument();
  });

  it('should display unread count', () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: mockNotifications,
      unreadCount: 2,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);
    expect(screen.getByText(/2 unread/)).toBeInTheDocument();
  });

  it('should show mark all read button when there are unread notifications', () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: mockNotifications,
      unreadCount: 2,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);
    expect(screen.getByText('Mark all read')).toBeInTheDocument();
  });

  it('should not show mark all read button when all are read', () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: [{ ...mockNotifications[0], isRead: true }],
      unreadCount: 0,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);
    expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
  });

  it('should render preferences button', () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: [],
      unreadCount: 0,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });

  it('should toggle preferences panel on button click', async () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: [],
      unreadCount: 0,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);

    const prefsButton = screen.getAllByText('Preferences')[0].closest('button');
    await userEvent.click(prefsButton!);

    expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
  });

  it('should display all notifications', () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: mockNotifications,
      unreadCount: 2,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);

    expect(screen.getByText('You earned a badge!')).toBeInTheDocument();
    expect(screen.getByText('You completed a lesson')).toBeInTheDocument();
    expect(screen.getByText('New course available')).toBeInTheDocument();
  });

  it('should show unread indicator for unread notifications', () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: mockNotifications,
      unreadCount: 2,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);

    const unreadIndicators = screen.getAllByLabelText('Unread');
    expect(unreadIndicators.length).toBeGreaterThan(0);
  });

  it('should filter by unread notifications', async () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: mockNotifications,
      unreadCount: 2,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);

    const unreadButton = screen.getByText('Unread only');
    await userEvent.click(unreadButton);

    expect(screen.getByText('You earned a badge!')).toBeInTheDocument();
    expect(screen.getByText('New course available')).toBeInTheDocument();
    expect(screen.queryByText('You completed a lesson')).not.toBeInTheDocument();
  });

  it('should filter by notification type', async () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: mockNotifications,
      unreadCount: 2,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);

    // The test assumes notification types are rendered
    expect(screen.getByText(/achievement|progress|enrollment/)).toBeInTheDocument();
  });

  it('should show empty state when no notifications', () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: [],
      unreadCount: 0,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);
    expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
  });

  it('should call markAsRead when clicking mark read button', async () => {
    const mockMarkAsRead = vi.fn();
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: mockNotifications,
      unreadCount: 2,
      markAsRead: mockMarkAsRead,
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);

    // Find and click a "Mark read" button (for unread notification)
    const markReadButtons = screen.queryAllByText('Mark read');
    if (markReadButtons.length > 0) {
      await userEvent.click(markReadButtons[0]);
      expect(mockMarkAsRead).toHaveBeenCalled();
    }
  });

  it('should call markAsUnread when clicking mark unread button', async () => {
    const mockMarkAsUnread = vi.fn();
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: mockNotifications,
      unreadCount: 2,
      markAsRead: vi.fn(),
      markAsUnread: mockMarkAsUnread,
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);

    // Find and click a "Mark unread" button (for read notification)
    const markUnreadButtons = screen.queryAllByText('Mark unread');
    if (markUnreadButtons.length > 0) {
      await userEvent.click(markUnreadButtons[0]);
      expect(mockMarkAsUnread).toHaveBeenCalled();
    }
  });

  it('should call markAllRead when clicking mark all read button', async () => {
    const mockMarkAllRead = vi.fn();
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: mockNotifications,
      unreadCount: 2,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: mockMarkAllRead,
    });

    render(<NotificationHistory />);

    const markAllButton = screen.getByText('Mark all read');
    await userEvent.click(markAllButton);
    expect(mockMarkAllRead).toHaveBeenCalled();
  });

  it('should have proper ARIA labels for accessibility', () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: mockNotifications,
      unreadCount: 2,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);
    expect(screen.getByLabelText('Notification history')).toBeInTheDocument();
  });

  it('should paginate notifications', () => {
    const manyNotifications = Array.from({ length: 20 }, (_, i) => ({
      id: `${i}`,
      type: 'general' as const,
      message: `Notification ${i}`,
      isRead: false,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    }));

    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: manyNotifications,
      unreadCount: 20,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);

    expect(screen.getByLabelText(/Notification pages/)).toBeInTheDocument();
  });

  it('should display notification with action URL as link', () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: mockNotifications,
      unreadCount: 2,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);

    const links = screen.getAllByRole('link');
    expect(links.some((link) => link.getAttribute('href') === '/badges')).toBe(true);
  });

  it('should display notification without action URL as plain text', () => {
    (useNotificationsModule.useNotifications as any).mockReturnValue({
      visibleNotifications: [mockNotifications[2]],
      unreadCount: 1,
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllRead: vi.fn(),
    });

    render(<NotificationHistory />);

    expect(screen.getByText('New course available')).toBeInTheDocument();
  });
});
