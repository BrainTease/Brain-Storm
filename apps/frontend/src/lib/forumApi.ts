/**
 * Forum API helpers — migrated to typed apiClient (#969)
 *
 * All functions return `ApiResult<T>` for consistent, try/catch-free
 * error handling at the call site.
 */

import apiClient, { type ApiResult } from './apiClient';

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
  getPosts(courseId: string, page = 1, limit = 10): Promise<ApiResult<PaginatedPosts>> {
    return apiClient.get<PaginatedPosts>(`/courses/${courseId}/posts`, {
      params: { page, limit },
    });
  },

  getPost(postId: string): Promise<ApiResult<PostWithReplies>> {
    return apiClient.get<PostWithReplies>(`/posts/${postId}`);
  },

  createPost(
    courseId: string,
    data: { title: string; content: string; isPinned?: boolean }
  ): Promise<ApiResult<Post>> {
    return apiClient.post<Post>(`/courses/${courseId}/posts`, data);
  },

  updatePost(
    postId: string,
    data: { title?: string; content?: string }
  ): Promise<ApiResult<Post>> {
    return apiClient.patch<Post>(`/posts/${postId}`, data);
  },

  deletePost(postId: string): Promise<ApiResult<void>> {
    return apiClient.delete(`/posts/${postId}`);
  },

  // Replies
  createReply(
    postId: string,
    data: { content: string; isAnswer?: boolean }
  ): Promise<ApiResult<Reply>> {
    return apiClient.post<Reply>(`/posts/${postId}/replies`, data);
  },

  updateReply(replyId: string, data: { content?: string }): Promise<ApiResult<Reply>> {
    return apiClient.patch<Reply>(`/replies/${replyId}`, data);
  },

  deleteReply(replyId: string): Promise<ApiResult<void>> {
    return apiClient.delete(`/replies/${replyId}`);
  },

  markAsAnswer(replyId: string): Promise<ApiResult<Reply>> {
    return apiClient.post<Reply>(`/replies/${replyId}/mark-answer`, {});
  },

  unmarkAsAnswer(replyId: string): Promise<ApiResult<Reply>> {
    return apiClient.post<Reply>(`/replies/${replyId}/unmark-answer`, {});
  },

  // Moderation
  flagContent(
    contentType: 'post' | 'reply',
    contentId: string,
    reason?: string
  ): Promise<ApiResult<void>> {
    return apiClient.post(`/moderation/flag`, {
      contentType: contentType.toUpperCase(),
      contentId,
      reason,
    });
  },
};
