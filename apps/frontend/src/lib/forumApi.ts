import api from './api';

export interface Post {
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

export interface Reply {
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

export interface PostWithReplies extends Post {
  replies: Reply[];
}

export interface PaginatedPosts {
  data: Post[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const forumApi = {
  // Posts
  getPosts: (courseId: string, page = 1, limit = 10) =>
    api
      .get<PaginatedPosts>(`/courses/${courseId}/posts`, {
        params: { page, limit },
      })
      .then((r) => r.data),

  getPost: (postId: string) =>
    api.get<PostWithReplies>(`/posts/${postId}`).then((r) => r.data),

  createPost: (courseId: string, data: { title: string; content: string; isPinned?: boolean }) =>
    api.post<Post>(`/courses/${courseId}/posts`, data).then((r) => r.data),

  updatePost: (postId: string, data: { title?: string; content?: string }) =>
    api.patch<Post>(`/posts/${postId}`, data).then((r) => r.data),

  deletePost: (postId: string) =>
    api.delete(`/posts/${postId}`).then((r) => r.data),

  // Replies
  createReply: (postId: string, data: { content: string; isAnswer?: boolean }) =>
    api.post<Reply>(`/posts/${postId}/replies`, data).then((r) => r.data),

  updateReply: (replyId: string, data: { content?: string }) =>
    api.patch<Reply>(`/replies/${replyId}`, data).then((r) => r.data),

  deleteReply: (replyId: string) =>
    api.delete(`/replies/${replyId}`).then((r) => r.data),

  markAsAnswer: (replyId: string) =>
    api.post<Reply>(`/replies/${replyId}/mark-answer`, {}).then((r) => r.data),

  unmarkAsAnswer: (replyId: string) =>
    api.post<Reply>(`/replies/${replyId}/unmark-answer`, {}).then((r) => r.data),

  // Moderation
  flagContent: (contentType: 'post' | 'reply', contentId: string, reason?: string) =>
    api
      .post(`/moderation/flag`, {
        contentType: contentType.toUpperCase(),
        contentId,
        reason,
      })
      .then((r) => r.data),
};
