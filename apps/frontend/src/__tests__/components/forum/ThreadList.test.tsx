import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThreadList } from '@/components/forum/ThreadList';
import * as forumHooks from '@/hooks/useForum';

// Mock the hook
jest.mock('@/hooks/useForum');

describe('ThreadList', () => {
  const mockPosts = [
    {
      id: '1',
      courseId: 'course-1',
      title: 'How to get started?',
      content: 'I am new to blockchain...',
      userId: 'user-1',
      user: { id: 'user-1', username: 'alice', avatar: '' },
      isPinned: false,
      replyCount: 3,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      courseId: 'course-1',
      title: 'Important Announcement',
      content: 'Course materials updated',
      userId: 'user-2',
      user: { id: 'user-2', username: 'instructor', avatar: '' },
      isPinned: true,
      replyCount: 0,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (forumHooks.useForumPosts as jest.Mock).mockReturnValue({
      posts: [],
      isLoading: true,
      error: null,
      hasMore: false,
      mutate: jest.fn(),
    });

    render(<ThreadList courseId="course-1" />);
    expect(screen.getByRole('heading', { name: /pinned/i })).toBeInTheDocument();
  });

  it('renders forum posts', async () => {
    (forumHooks.useForumPosts as jest.Mock).mockReturnValue({
      posts: mockPosts,
      isLoading: false,
      error: null,
      hasMore: false,
      mutate: jest.fn(),
    });

    render(<ThreadList courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByText('How to get started?')).toBeInTheDocument();
      expect(screen.getByText('Important Announcement')).toBeInTheDocument();
    });
  });

  it('shows pinned posts in separate section', async () => {
    (forumHooks.useForumPosts as jest.Mock).mockReturnValue({
      posts: mockPosts,
      isLoading: false,
      error: null,
      hasMore: false,
      mutate: jest.fn(),
    });

    render(<ThreadList courseId="course-1" />);

    await waitFor(() => {
      const pinned = screen.getByText(/pinned/i);
      expect(pinned).toBeInTheDocument();
    });
  });

  it('shows load more button when hasMore is true', async () => {
    (forumHooks.useForumPosts as jest.Mock).mockReturnValue({
      posts: mockPosts,
      isLoading: false,
      error: null,
      hasMore: true,
      mutate: jest.fn(),
    });

    render(<ThreadList courseId="course-1" />);

    await waitFor(() => {
      expect(screen.getByText(/load more/i)).toBeInTheDocument();
    });
  });

  it('renders error state', () => {
    (forumHooks.useForumPosts as jest.Mock).mockReturnValue({
      posts: [],
      isLoading: false,
      error: new Error('Failed to fetch'),
      hasMore: false,
      mutate: jest.fn(),
    });

    render(<ThreadList courseId="course-1" />);

    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('shows empty state when no posts', () => {
    (forumHooks.useForumPosts as jest.Mock).mockReturnValue({
      posts: [],
      isLoading: false,
      error: null,
      hasMore: false,
      mutate: jest.fn(),
    });

    render(<ThreadList courseId="course-1" />);

    expect(screen.getByText(/no discussions yet/i)).toBeInTheDocument();
  });
});
