import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
/**
 * Unit tests for forumApi.ts
 * 
 * Tests the forum API module covering posts, replies, and moderation
 * with comprehensive error handling and ApiResult validation.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

import { forumApi } from '@/lib/forumApi';

import {
  mockForumPost,
  mockPinnedPost,
  mockReply,
  mockReplyNotAnswer,
  mockPaginatedPosts,
} from '../fixtures';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// MSW server setup
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('forumApi - Posts', () => {
  describe('getPosts', () => {
    it('should fetch paginated posts for a course', async () => {
      server.use(
        http.get(`${BASE_URL}/courses/course-1/posts`, ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          const limit = url.searchParams.get('limit');
          
          return HttpResponse.json({
            ...mockPaginatedPosts,
            page: Number(page),
            limit: Number(limit),
          });
        })
      );

      const result = await forumApi.getPosts('course-1', 1, 10);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.data).toHaveLength(2);
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
        expect(result.data.total).toBe(2);
      }
    });

    it('should use default pagination parameters', async () => {
      server.use(
        http.get(`${BASE_URL}/courses/course-1/posts`, ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          const limit = url.searchParams.get('limit');
          
          return HttpResponse.json({
            ...mockPaginatedPosts,
            page: Number(page) || 1,
            limit: Number(limit) || 10,
          });
        })
      );

      const result = await forumApi.getPosts('course-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should handle empty posts list', async () => {
      server.use(
        http.get(`${BASE_URL}/courses/course-999/posts`, () => {
          return HttpResponse.json({
            data: [],
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
            hasMore: false,
          });
        })
      );

      const result = await forumApi.getPosts('course-999');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.data).toHaveLength(0);
        expect(result.data.total).toBe(0);
        expect(result.data.hasMore).toBe(false);
      }
    });

    it('should handle 404 when course not found', async () => {
      server.use(
        http.get(`${BASE_URL}/courses/nonexistent/posts`, () => {
          return HttpResponse.json(
            { message: 'Course not found' },
            { status: 404 }
          );
        })
      );

      const result = await forumApi.getPosts('nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('not_found');
      }
    });

    it('should handle unauthorized access', async () => {
      server.use(
        http.get(`${BASE_URL}/courses/private-course/posts`, () => {
          return HttpResponse.json(
            { message: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      const result = await forumApi.getPosts('private-course');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('unauthorized');
      }
    });
  });

  describe('getPost', () => {
    it('should fetch a single post with replies', async () => {
      server.use(
        http.get(`${BASE_URL}/posts/post-1`, () => {
          return HttpResponse.json({
            ...mockForumPost,
            replies: [mockReply, mockReplyNotAnswer],
          });
        })
      );

      const result = await forumApi.getPost('post-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('post-1');
        expect(result.data.title).toBe('Question about smart contracts');
        expect(result.data.replies).toHaveLength(2);
      }
    });

    it('should handle post not found', async () => {
      server.use(
        http.get(`${BASE_URL}/posts/nonexistent`, () => {
          return HttpResponse.json(
            { message: 'Post not found' },
            { status: 404 }
          );
        })
      );

      const result = await forumApi.getPost('nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('not_found');
      }
    });

    it('should fetch post with no replies', async () => {
      server.use(
        http.get(`${BASE_URL}/posts/post-2`, () => {
          return HttpResponse.json({
            ...mockPinnedPost,
            replies: [],
          });
        })
      );

      const result = await forumApi.getPost('post-2');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.replies).toHaveLength(0);
        expect(result.data.isPinned).toBe(true);
      }
    });
  });

  describe('createPost', () => {
    it('should create a new post', async () => {
      server.use(
        http.post(`${BASE_URL}/courses/course-1/posts`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json(
            {
              id: 'new-post-1',
              courseId: 'course-1',
              userId: 'user-1',
              ...body,
              createdAt: '2024-01-21T00:00:00.000Z',
            },
            { status: 201 }
          );
        })
      );

      const postData = {
        title: 'New Question',
        content: 'How do I get started?',
      };

      const result = await forumApi.createPost('course-1', postData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('new-post-1');
        expect(result.data.title).toBe('New Question');
        expect(result.data.content).toBe('How do I get started?');
      }
    });

    it('should create pinned post', async () => {
      server.use(
        http.post(`${BASE_URL}/courses/course-1/posts`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json(
            {
              id: 'new-pinned-post',
              courseId: 'course-1',
              ...body,
              createdAt: '2024-01-21T00:00:00.000Z',
            },
            { status: 201 }
          );
        })
      );

      const postData = {
        title: 'Important Announcement',
        content: 'Please read this',
        isPinned: true,
      };

      const result = await forumApi.createPost('course-1', postData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isPinned).toBe(true);
      }
    });

    it('should handle validation errors', async () => {
      server.use(
        http.post(`${BASE_URL}/courses/course-1/posts`, () => {
          return HttpResponse.json(
            { message: 'Title is required' },
            { status: 400 }
          );
        })
      );

      const result = await forumApi.createPost('course-1', {
        title: '',
        content: 'Content',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('validation');
      }
    });

    it('should handle unauthorized post creation', async () => {
      server.use(
        http.post(`${BASE_URL}/courses/course-1/posts`, () => {
          return HttpResponse.json(
            { message: 'Must be enrolled to post' },
            { status: 403 }
          );
        })
      );

      const result = await forumApi.createPost('course-1', {
        title: 'Question',
        content: 'Content',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('forbidden');
      }
    });
  });

  describe('updatePost', () => {
    it('should update post title and content', async () => {
      server.use(
        http.patch(`${BASE_URL}/posts/post-1`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            ...mockForumPost,
            ...body,
            updatedAt: '2024-01-21T00:00:00.000Z',
          });
        })
      );

      const updates = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      const result = await forumApi.updatePost('post-1', updates);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.title).toBe('Updated Title');
        expect(result.data.content).toBe('Updated content');
        expect(result.data.updatedAt).toBeDefined();
      }
    });

    it('should update only title', async () => {
      server.use(
        http.patch(`${BASE_URL}/posts/post-1`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            ...mockForumPost,
            ...body,
          });
        })
      );

      const result = await forumApi.updatePost('post-1', {
        title: 'Only Title Updated',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.title).toBe('Only Title Updated');
      }
    });

    it('should handle 403 when user cannot edit post', async () => {
      server.use(
        http.patch(`${BASE_URL}/posts/post-1`, () => {
          return HttpResponse.json(
            { message: 'Cannot edit another users post' },
            { status: 403 }
          );
        })
      );

      const result = await forumApi.updatePost('post-1', { title: 'Hack' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('forbidden');
      }
    });

    it('should handle post not found', async () => {
      server.use(
        http.patch(`${BASE_URL}/posts/nonexistent`, () => {
          return HttpResponse.json(
            { message: 'Post not found' },
            { status: 404 }
          );
        })
      );

      const result = await forumApi.updatePost('nonexistent', { title: 'Test' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('not_found');
      }
    });
  });

  describe('deletePost', () => {
    it('should delete a post', async () => {
      server.use(
        http.delete(`${BASE_URL}/posts/post-1`, () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await forumApi.deletePost('post-1');

      expect(result.ok).toBe(true);
    });

    it('should handle 403 when user cannot delete post', async () => {
      server.use(
        http.delete(`${BASE_URL}/posts/post-1`, () => {
          return HttpResponse.json(
            { message: 'Cannot delete another users post' },
            { status: 403 }
          );
        })
      );

      const result = await forumApi.deletePost('post-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('forbidden');
      }
    });

    it('should handle post not found', async () => {
      server.use(
        http.delete(`${BASE_URL}/posts/nonexistent`, () => {
          return HttpResponse.json(
            { message: 'Post not found' },
            { status: 404 }
          );
        })
      );

      const result = await forumApi.deletePost('nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('not_found');
      }
    });
  });
});

describe('forumApi - Replies', () => {
  describe('createReply', () => {
    it('should create a reply to a post', async () => {
      server.use(
        http.post(`${BASE_URL}/posts/post-1/replies`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json(
            {
              id: 'new-reply-1',
              postId: 'post-1',
              userId: 'user-1',
              ...body,
              createdAt: '2024-01-21T00:00:00.000Z',
            },
            { status: 201 }
          );
        })
      );

      const replyData = {
        content: 'Thanks for the question!',
      };

      const result = await forumApi.createReply('post-1', replyData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('new-reply-1');
        expect(result.data.content).toBe('Thanks for the question!');
        expect(result.data.postId).toBe('post-1');
      }
    });

    it('should create reply marked as answer', async () => {
      server.use(
        http.post(`${BASE_URL}/posts/post-1/replies`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json(
            {
              id: 'answer-reply',
              postId: 'post-1',
              ...body,
              createdAt: '2024-01-21T00:00:00.000Z',
            },
            { status: 201 }
          );
        })
      );

      const result = await forumApi.createReply('post-1', {
        content: 'Here is the answer',
        isAnswer: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isAnswer).toBe(true);
      }
    });

    it('should handle validation errors', async () => {
      server.use(
        http.post(`${BASE_URL}/posts/post-1/replies`, () => {
          return HttpResponse.json(
            { message: 'Content cannot be empty' },
            { status: 400 }
          );
        })
      );

      const result = await forumApi.createReply('post-1', { content: '' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('validation');
      }
    });

    it('should handle post not found', async () => {
      server.use(
        http.post(`${BASE_URL}/posts/nonexistent/replies`, () => {
          return HttpResponse.json(
            { message: 'Post not found' },
            { status: 404 }
          );
        })
      );

      const result = await forumApi.createReply('nonexistent', { content: 'Reply' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('not_found');
      }
    });
  });

  describe('updateReply', () => {
    it('should update reply content', async () => {
      server.use(
        http.patch(`${BASE_URL}/replies/reply-1`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            ...mockReply,
            ...body,
            updatedAt: '2024-01-21T00:00:00.000Z',
          });
        })
      );

      const result = await forumApi.updateReply('reply-1', {
        content: 'Updated reply content',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.content).toBe('Updated reply content');
        expect(result.data.updatedAt).toBeDefined();
      }
    });

    it('should handle 403 when user cannot edit reply', async () => {
      server.use(
        http.patch(`${BASE_URL}/replies/reply-1`, () => {
          return HttpResponse.json(
            { message: 'Cannot edit another users reply' },
            { status: 403 }
          );
        })
      );

      const result = await forumApi.updateReply('reply-1', { content: 'Hack' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('forbidden');
      }
    });

    it('should handle reply not found', async () => {
      server.use(
        http.patch(`${BASE_URL}/replies/nonexistent`, () => {
          return HttpResponse.json(
            { message: 'Reply not found' },
            { status: 404 }
          );
        })
      );

      const result = await forumApi.updateReply('nonexistent', { content: 'Test' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('not_found');
      }
    });
  });

  describe('deleteReply', () => {
    it('should delete a reply', async () => {
      server.use(
        http.delete(`${BASE_URL}/replies/reply-1`, () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await forumApi.deleteReply('reply-1');

      expect(result.ok).toBe(true);
    });

    it('should handle 403 when user cannot delete reply', async () => {
      server.use(
        http.delete(`${BASE_URL}/replies/reply-1`, () => {
          return HttpResponse.json(
            { message: 'Cannot delete another users reply' },
            { status: 403 }
          );
        })
      );

      const result = await forumApi.deleteReply('reply-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('forbidden');
      }
    });

    it('should handle reply not found', async () => {
      server.use(
        http.delete(`${BASE_URL}/replies/nonexistent`, () => {
          return HttpResponse.json(
            { message: 'Reply not found' },
            { status: 404 }
          );
        })
      );

      const result = await forumApi.deleteReply('nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('not_found');
      }
    });
  });

  describe('markAsAnswer', () => {
    it('should mark a reply as the answer', async () => {
      server.use(
        http.post(`${BASE_URL}/replies/reply-1/mark-answer`, () => {
          return HttpResponse.json({
            ...mockReply,
            isAnswer: true,
          });
        })
      );

      const result = await forumApi.markAsAnswer('reply-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isAnswer).toBe(true);
      }
    });

    it('should handle 403 when user cannot mark as answer', async () => {
      server.use(
        http.post(`${BASE_URL}/replies/reply-1/mark-answer`, () => {
          return HttpResponse.json(
            { message: 'Only post author can mark answer' },
            { status: 403 }
          );
        })
      );

      const result = await forumApi.markAsAnswer('reply-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('forbidden');
      }
    });

    it('should handle reply not found', async () => {
      server.use(
        http.post(`${BASE_URL}/replies/nonexistent/mark-answer`, () => {
          return HttpResponse.json(
            { message: 'Reply not found' },
            { status: 404 }
          );
        })
      );

      const result = await forumApi.markAsAnswer('nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('not_found');
      }
    });
  });

  describe('unmarkAsAnswer', () => {
    it('should unmark a reply as answer', async () => {
      server.use(
        http.post(`${BASE_URL}/replies/reply-1/unmark-answer`, () => {
          return HttpResponse.json({
            ...mockReply,
            isAnswer: false,
          });
        })
      );

      const result = await forumApi.unmarkAsAnswer('reply-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isAnswer).toBe(false);
      }
    });

    it('should handle 403 when user cannot unmark answer', async () => {
      server.use(
        http.post(`${BASE_URL}/replies/reply-1/unmark-answer`, () => {
          return HttpResponse.json(
            { message: 'Only post author can unmark answer' },
            { status: 403 }
          );
        })
      );

      const result = await forumApi.unmarkAsAnswer('reply-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('forbidden');
      }
    });
  });
});

describe('forumApi - Moderation', () => {
  describe('flagContent', () => {
    it('should flag a post', async () => {
      server.use(
        http.post(`${BASE_URL}/moderation/flag`, async ({ request }) => {
          const body = await request.json();
          expect(body.contentType).toBe('POST');
          expect(body.contentId).toBe('post-1');
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await forumApi.flagContent('post', 'post-1');

      expect(result.ok).toBe(true);
    });

    it('should flag a reply', async () => {
      server.use(
        http.post(`${BASE_URL}/moderation/flag`, async ({ request }) => {
          const body = await request.json();
          expect(body.contentType).toBe('REPLY');
          expect(body.contentId).toBe('reply-1');
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await forumApi.flagContent('reply', 'reply-1');

      expect(result.ok).toBe(true);
    });

    it('should flag content with reason', async () => {
      server.use(
        http.post(`${BASE_URL}/moderation/flag`, async ({ request }) => {
          const body = await request.json();
          expect(body.reason).toBe('Spam');
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await forumApi.flagContent('post', 'post-1', 'Spam');

      expect(result.ok).toBe(true);
    });

    it('should handle validation errors', async () => {
      server.use(
        http.post(`${BASE_URL}/moderation/flag`, () => {
          return HttpResponse.json(
            { message: 'Invalid content type' },
            { status: 400 }
          );
        })
      );

      const result = await forumApi.flagContent('post', 'invalid');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('validation');
      }
    });

    it('should handle content not found', async () => {
      server.use(
        http.post(`${BASE_URL}/moderation/flag`, () => {
          return HttpResponse.json(
            { message: 'Content not found' },
            { status: 404 }
          );
        })
      );

      const result = await forumApi.flagContent('post', 'nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('not_found');
      }
    });

    it('should handle duplicate flag attempts', async () => {
      server.use(
        http.post(`${BASE_URL}/moderation/flag`, () => {
          return HttpResponse.json(
            { message: 'Already flagged by this user' },
            { status: 409 }
          );
        })
      );

      const result = await forumApi.flagContent('post', 'post-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('conflict');
      }
    });
  });
});
