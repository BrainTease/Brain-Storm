/**
 * Forum fixtures for testing
 */

export interface TestPost {
  id: string;
  courseId: string;
  title: string;
  content: string;
  userId: string;
  user?: {
    id: string;
    username: string;
    avatar?: string;
  };
  isPinned: boolean;
  answerReplyId?: string | null;
  replyCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface TestReply {
  id: string;
  postId: string;
  content: string;
  userId: string;
  user?: {
    id: string;
    username: string;
    avatar?: string;
  };
  isAnswer: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const mockForumPost: TestPost = {
  id: 'post-1',
  courseId: 'course-1',
  title: 'Question about smart contracts',
  content: 'How do I deploy a smart contract on Stellar?',
  userId: 'user-1',
  user: {
    id: 'user-1',
    username: 'student1',
  },
  isPinned: false,
  replyCount: 2,
  createdAt: '2024-01-15T00:00:00.000Z',
};

export const mockPinnedPost: TestPost = {
  id: 'post-2',
  courseId: 'course-1',
  title: 'Course Guidelines',
  content: 'Please read these guidelines before posting',
  userId: 'user-2',
  user: {
    id: 'user-2',
    username: 'instructor1',
  },
  isPinned: true,
  replyCount: 0,
  createdAt: '2024-01-10T00:00:00.000Z',
};

export const mockReply: TestReply = {
  id: 'reply-1',
  postId: 'post-1',
  content: 'You can use the Soroban SDK to deploy contracts',
  userId: 'user-2',
  user: {
    id: 'user-2',
    username: 'instructor1',
  },
  isAnswer: true,
  createdAt: '2024-01-15T01:00:00.000Z',
};

export const mockReplyNotAnswer: TestReply = {
  id: 'reply-2',
  postId: 'post-1',
  content: 'Thanks for the helpful answer!',
  userId: 'user-1',
  user: {
    id: 'user-1',
    username: 'student1',
  },
  isAnswer: false,
  createdAt: '2024-01-15T02:00:00.000Z',
};

export const mockPaginatedPosts = {
  data: [mockForumPost, mockPinnedPost],
  total: 2,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasMore: false,
};
