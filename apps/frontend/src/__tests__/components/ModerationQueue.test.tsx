import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('@/lib/moderationApi', () => ({
  getQueue: vi.fn(),
  reviewItem: vi.fn(),
  getItemLogs: vi.fn(),
  bulkReview: vi.fn(),
}));

import * as moderationApi from '@/lib/moderationApi';
import { ModerationQueue } from '@/components/admin/ModerationQueue';

const mockItems = [
  {
    id: 'item-1',
    contentType: 'post' as const,
    contentId: 'post-42',
    flagReason: 'Spam content',
    status: 'pending' as const,
    createdAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'item-2',
    contentType: 'course' as const,
    contentId: 'course-7',
    flagReason: 'Inappropriate material',
    status: 'approved' as const,
    createdAt: '2026-06-02T12:00:00.000Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ModerationQueue', () => {
  it('renders loading state initially', () => {
    vi.mocked(moderationApi.getQueue).mockReturnValue(new Promise(() => {})); // never resolves
    render(<ModerationQueue />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });

  it('renders items after fetch', async () => {
    vi.mocked(moderationApi.getQueue).mockResolvedValue(mockItems);
    render(<ModerationQueue />);
    await waitFor(() => expect(screen.getByText('post-42')).toBeInTheDocument());
    expect(screen.getByText('Spam content')).toBeInTheDocument();
    expect(screen.getByText('course-7')).toBeInTheDocument();
  });

  it('filter change triggers re-fetch', async () => {
    vi.mocked(moderationApi.getQueue).mockResolvedValue(mockItems);
    render(<ModerationQueue />);
    await waitFor(() => expect(moderationApi.getQueue).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByRole('combobox', { name: /filter by status/i }), {
      target: { value: 'pending' },
    });

    await waitFor(() => expect(moderationApi.getQueue).toHaveBeenCalledTimes(2));
    expect(moderationApi.getQueue).toHaveBeenLastCalledWith({ status: 'pending', contentType: undefined });
  });

  it('approve button calls reviewItem', async () => {
    vi.mocked(moderationApi.getQueue).mockResolvedValue(mockItems);
    vi.mocked(moderationApi.reviewItem).mockResolvedValue({});
    render(<ModerationQueue />);
    await waitFor(() => expect(screen.getByLabelText(/approve item item-1/i)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText(/approve item item-1/i));

    await waitFor(() =>
      expect(moderationApi.reviewItem).toHaveBeenCalledWith('item-1', 'approved')
    );
  });
});
