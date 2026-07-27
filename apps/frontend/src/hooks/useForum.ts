import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { forumApi, Post, Reply, PostWithReplies, PaginatedPosts } from '@/lib/forumApi';

export function useForumPosts(courseId: string, page = 1) {
  const { data, error, isLoading, mutate } = useSWR<PaginatedPosts>(
    courseId ? [`/forums/posts/${courseId}`, page] : null,
    () => forumApi.getPosts(courseId, page),
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  return {
    posts: data?.data || [],
    total: data?.total || 0,
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    mutate,
  };
}

export function useForumPost(postId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<PostWithReplies>(
    postId ? `/forums/post/${postId}` : null,
    () => forumApi.getPost(postId!),
    { revalidateOnFocus: false }
  );

  return {
    post: data,
    isLoading,
    error,
    mutate,
  };
}

export function useCreatePost(courseId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPost = useCallback(
    async (title: string, content: string, isPinned = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const post = await forumApi.createPost(courseId, { title, content, isPinned });
        return post;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create post');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [courseId]
  );

  return { createPost, isLoading, error };
}

export function useCreateReply(postId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createReply = useCallback(
    async (content: string, isAnswer = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const reply = await forumApi.createReply(postId, { content, isAnswer });
        return reply;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create reply');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [postId]
  );

  return { createReply, isLoading, error };
}

export function useMarkAsAnswer() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const markAsAnswer = useCallback(async (replyId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await forumApi.markAsAnswer(replyId);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to mark as answer');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { markAsAnswer, isLoading, error };
}

export function useDeletePost() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deletePost = useCallback(async (postId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await forumApi.deletePost(postId);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete post');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deletePost, isLoading, error };
}

export function useDeleteReply() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteReply = useCallback(async (replyId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await forumApi.deleteReply(replyId);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete reply');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteReply, isLoading, error };
}

export function useFlagContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const flagContent = useCallback(
    async (contentType: 'post' | 'reply', contentId: string, reason?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await forumApi.flagContent(contentType, contentId, reason);
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to flag content');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { flagContent, isLoading, error };
}
