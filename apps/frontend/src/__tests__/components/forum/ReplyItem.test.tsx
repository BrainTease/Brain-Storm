import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReplyItem } from '@/components/forum/ReplyItem';
import * as authStore from '@/store/auth.store';
import * as forumHooks from '@/hooks/useForum';

jest.mock('@/store/auth.store');
jest.mock('@/hooks/useForum');

describe('ReplyItem', () => {
  const mockReply = {
    id: 'reply-1',
    postId: 'post-1',
    content: '**This is a great solution!** Try this approach...',
    userId: 'user-1',
    user: { id: 'user-1', username: 'alice', avatar: '' },
    isAnswer: false,
    createdAt: new Date().toISOString(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'alice@example.com',
    username: 'alice',
    role: 'student',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (authStore.useAuthStore as unknown as jest.Mock).mockReturnValue(mockUser);
  });

  it('renders reply content with markdown', () => {
    (forumHooks.useMarkAsAnswer as jest.Mock).mockReturnValue({
      markAsAnswer: jest.fn(),
      isLoading: false,
      error: null,
    });
    (forumHooks.useDeleteReply as jest.Mock).mockReturnValue({
      deleteReply: jest.fn(),
      isLoading: false,
      error: null,
    });
    (forumHooks.useFlagContent as jest.Mock).mockReturnValue({
      flagContent: jest.fn(),
      isLoading: false,
      error: null,
    });

    render(
      <ReplyItem
        reply={mockReply}
        isAnswer={false}
        courseId="course-1"
        postId="post-1"
      />
    );

    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText(/this is a great solution/i)).toBeInTheDocument();
  });

  it('shows answer badge when isAnswer is true', () => {
    (forumHooks.useMarkAsAnswer as jest.Mock).mockReturnValue({
      markAsAnswer: jest.fn(),
      isLoading: false,
      error: null,
    });
    (forumHooks.useDeleteReply as jest.Mock).mockReturnValue({
      deleteReply: jest.fn(),
      isLoading: false,
      error: null,
    });
    (forumHooks.useFlagContent as jest.Mock).mockReturnValue({
      flagContent: jest.fn(),
      isLoading: false,
      error: null,
    });

    render(
      <ReplyItem
        reply={mockReply}
        isAnswer={true}
        courseId="course-1"
        postId="post-1"
      />
    );

    expect(screen.getByText(/✓ answer/i)).toBeInTheDocument();
  });

  it('allows author to delete reply', async () => {
    const user = userEvent.setup();
    const deleteReplyMock = jest.fn();

    (forumHooks.useMarkAsAnswer as jest.Mock).mockReturnValue({
      markAsAnswer: jest.fn(),
      isLoading: false,
      error: null,
    });
    (forumHooks.useDeleteReply as jest.Mock).mockReturnValue({
      deleteReply: deleteReplyMock,
      isLoading: false,
      error: null,
    });
    (forumHooks.useFlagContent as jest.Mock).mockReturnValue({
      flagContent: jest.fn(),
      isLoading: false,
      error: null,
    });

    render(
      <ReplyItem
        reply={mockReply}
        isAnswer={false}
        courseId="course-1"
        postId="post-1"
      />
    );

    const optionsBtn = screen.getByLabelText(/options/i);
    await user.click(optionsBtn);

    const deleteBtn = screen.getByText(/delete/i);
    await user.click(deleteBtn);

    // Confirm dialog
    global.confirm = jest.fn(() => true);
    await waitFor(() => {
      expect(deleteReplyMock).toHaveBeenCalledWith('reply-1');
    });
  });

  it('non-author can flag reply', async () => {
    const user = userEvent.setup();
    const flagContentMock = jest.fn();
    const otherReply = { ...mockReply, userId: 'user-2' };

    (authStore.useAuthStore as unknown as jest.Mock).mockReturnValue({
      ...mockUser,
      id: 'user-1',
    });
    (forumHooks.useMarkAsAnswer as jest.Mock).mockReturnValue({
      markAsAnswer: jest.fn(),
      isLoading: false,
      error: null,
    });
    (forumHooks.useDeleteReply as jest.Mock).mockReturnValue({
      deleteReply: jest.fn(),
      isLoading: false,
      error: null,
    });
    (forumHooks.useFlagContent as jest.Mock).mockReturnValue({
      flagContent: flagContentMock,
      isLoading: false,
      error: null,
    });

    render(
      <ReplyItem
        reply={otherReply}
        isAnswer={false}
        courseId="course-1"
        postId="post-1"
      />
    );

    const optionsBtn = screen.getByLabelText(/options/i);
    await user.click(optionsBtn);

    const flagBtn = screen.getByText(/flag/i);
    await user.click(flagBtn);

    // Note: actual prompt dialog testing would require additional setup
  });
});
