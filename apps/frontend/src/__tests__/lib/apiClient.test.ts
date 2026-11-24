import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
/**
 * Unit tests for apiClient.ts
 * 
 * Tests the typed API client wrapper with Result<T> shape, error handling,
 * error classification, and all HTTP methods (get, post, patch, put, delete).
 * 
 * Uses MSW to mock HTTP responses for deterministic testing.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

import {
  apiClient,
  ApiRoutes,
  classifyErrorCode,
  classifyStatus,
  type ApiError,
  type ApiSuccess,
} from '@/lib/apiClient';

import {
  mockAuthResponse,
  mockLoginRequest,
  mockStudent,
  mockBeginnerCourse,
  mockCourses,
} from '../fixtures';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// MSW server setup
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('apiClient - HTTP methods', () => {
  describe('GET requests', () => {
    it('should successfully fetch data with apiClient.get', async () => {
      server.use(
        http.get(`${BASE_URL}/test`, () => {
          return HttpResponse.json({ message: 'success' });
        })
      );

      const result = await apiClient.get<{ message: string }>('/test');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ message: 'success' });
      }
    });

    it('should handle GET request with query params', async () => {
      server.use(
        http.get(`${BASE_URL}/items`, ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          const limit = url.searchParams.get('limit');
          
          return HttpResponse.json({ 
            page: Number(page), 
            limit: Number(limit),
            items: [] 
          });
        })
      );

      const result = await apiClient.get<{ page: number; limit: number; items: unknown[] }>(
        '/items',
        { params: { page: 2, limit: 20 } }
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(20);
      }
    });
  });

  describe('POST requests', () => {
    it('should successfully post data with apiClient.post', async () => {
      server.use(
        http.post(`${BASE_URL}/items`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ id: 'new-id', ...body }, { status: 201 });
        })
      );

      const payload = { title: 'New Item', description: 'Test' };
      const result = await apiClient.post<{ id: string; title: string; description: string }>(
        '/items',
        payload
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('new-id');
        expect(result.data.title).toBe('New Item');
      }
    });

    it('should handle POST with empty body', async () => {
      server.use(
        http.post(`${BASE_URL}/action`, () => {
          return HttpResponse.json({ success: true });
        })
      );

      const result = await apiClient.post<{ success: boolean }>('/action');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.success).toBe(true);
      }
    });
  });

  describe('PATCH requests', () => {
    it('should successfully patch data with apiClient.patch', async () => {
      server.use(
        http.patch(`${BASE_URL}/items/123`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ id: '123', updated: true, ...body });
        })
      );

      const updates = { title: 'Updated Title' };
      const result = await apiClient.patch<{ id: string; updated: boolean; title: string }>(
        '/items/123',
        updates
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('123');
        expect(result.data.title).toBe('Updated Title');
        expect(result.data.updated).toBe(true);
      }
    });
  });

  describe('PUT requests', () => {
    it('should successfully put data with apiClient.put', async () => {
      server.use(
        http.put(`${BASE_URL}/items/456`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ id: '456', replaced: true, ...body });
        })
      );

      const data = { title: 'Full Replacement', description: 'Complete data' };
      const result = await apiClient.put<{ id: string; replaced: boolean; title: string }>(
        '/items/456',
        data
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('456');
        expect(result.data.replaced).toBe(true);
        expect(result.data.title).toBe('Full Replacement');
      }
    });
  });

  describe('DELETE requests', () => {
    it('should successfully delete with apiClient.delete', async () => {
      server.use(
        http.delete(`${BASE_URL}/items/789`, () => {
          return HttpResponse.json({ deleted: true });
        })
      );

      const result = await apiClient.delete<{ deleted: boolean }>('/items/789');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.deleted).toBe(true);
      }
    });

    it('should handle DELETE with no response body', async () => {
      server.use(
        http.delete(`${BASE_URL}/items/999`, () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await apiClient.delete<void>('/items/999');

      expect(result.ok).toBe(true);
    });
  });
});

describe('apiClient - Error handling', () => {
  describe('HTTP error status codes', () => {
    it('should handle 400 Bad Request as validation error', async () => {
      server.use(
        http.post(`${BASE_URL}/items`, () => {
          return HttpResponse.json(
            { message: 'Invalid input', code: 'VALIDATION_ERROR' },
            { status: 400 }
          );
        })
      );

      const result = await apiClient.post('/items', {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('validation');
        expect(result.error.status).toBe(400);
        expect(result.error.message).toContain('Invalid input');
      }
    });

    it('should handle 401 Unauthorized', async () => {
      server.use(
        http.get(`${BASE_URL}/protected`, () => {
          return HttpResponse.json(
            { message: 'Unauthorized', code: 'UNAUTHORIZED' },
            { status: 401 }
          );
        })
      );

      const result = await apiClient.get('/protected');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('unauthorized');
        expect(result.error.status).toBe(401);
      }
    });

    it('should handle 403 Forbidden', async () => {
      server.use(
        http.get(`${BASE_URL}/admin`, () => {
          return HttpResponse.json(
            { message: 'Forbidden', code: 'FORBIDDEN' },
            { status: 403 }
          );
        })
      );

      const result = await apiClient.get('/admin');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('forbidden');
        expect(result.error.status).toBe(403);
      }
    });

    it('should handle 404 Not Found', async () => {
      server.use(
        http.get(`${BASE_URL}/items/nonexistent`, () => {
          return HttpResponse.json(
            { message: 'Not found', code: 'NOT_FOUND' },
            { status: 404 }
          );
        })
      );

      const result = await apiClient.get('/items/nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('not_found');
        expect(result.error.status).toBe(404);
      }
    });

    it('should handle 409 Conflict', async () => {
      server.use(
        http.post(`${BASE_URL}/items`, () => {
          return HttpResponse.json(
            { message: 'Already exists', code: 'CONFLICT' },
            { status: 409 }
          );
        })
      );

      const result = await apiClient.post('/items', {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('conflict');
        expect(result.error.status).toBe(409);
      }
    });

    it('should handle 500 Internal Server Error', async () => {
      server.use(
        http.get(`${BASE_URL}/error`, () => {
          return HttpResponse.json(
            { message: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 }
          );
        })
      );

      const result = await apiClient.get('/error');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('server');
        expect(result.error.status).toBe(500);
      }
    });

    it('should handle 503 Service Unavailable', async () => {
      server.use(
        http.get(`${BASE_URL}/unavailable`, () => {
          return HttpResponse.json(
            { message: 'Service unavailable' },
            { status: 503 }
          );
        })
      );

      const result = await apiClient.get('/unavailable');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('server');
        expect(result.error.status).toBe(503);
      }
    });
  });

  describe('Network errors', () => {
    it('should handle network errors (no response)', async () => {
      server.use(
        http.get(`${BASE_URL}/network-error`, () => {
          return HttpResponse.error();
        })
      );

      const result = await apiClient.get('/network-error');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('network');
        expect(result.error.status).toBeUndefined();
      }
    });
  });

  describe('Error message extraction', () => {
    it('should extract message from response.data.message', async () => {
      server.use(
        http.get(`${BASE_URL}/error-message`, () => {
          return HttpResponse.json(
            { message: 'Custom error message' },
            { status: 400 }
          );
        })
      );

      const result = await apiClient.get('/error-message');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Custom error message');
      }
    });

    it('should extract message from response.data.error', async () => {
      server.use(
        http.get(`${BASE_URL}/error-field`, () => {
          return HttpResponse.json(
            { error: 'Error from error field' },
            { status: 400 }
          );
        })
      );

      const result = await apiClient.get('/error-field');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Error from error field');
      }
    });

    it('should use default message when no message field exists', async () => {
      server.use(
        http.get(`${BASE_URL}/no-message`, () => {
          return HttpResponse.json({}, { status: 400 });
        })
      );

      const result = await apiClient.get('/no-message');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('An unexpected error occurred.');
      }
    });

    it('should include raw response data in error', async () => {
      server.use(
        http.get(`${BASE_URL}/with-raw`, () => {
          return HttpResponse.json(
            { message: 'Error', details: 'Extra info' },
            { status: 400 }
          );
        })
      );

      const result = await apiClient.get('/with-raw');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.raw).toEqual({ message: 'Error', details: 'Extra info' });
      }
    });
  });
});

describe('Error classification functions', () => {
  describe('classifyErrorCode', () => {
    it('should classify UNAUTHORIZED codes', () => {
      expect(classifyErrorCode('UNAUTHORIZED')).toBe('unauthorized');
      expect(classifyErrorCode('UNAUTHENTICATED')).toBe('unauthorized');
    });

    it('should classify FORBIDDEN codes', () => {
      expect(classifyErrorCode('FORBIDDEN')).toBe('forbidden');
    });

    it('should classify NOT_FOUND codes', () => {
      expect(classifyErrorCode('NOT_FOUND')).toBe('not_found');
    });

    it('should classify CONFLICT codes', () => {
      expect(classifyErrorCode('CONFLICT')).toBe('conflict');
      expect(classifyErrorCode('ALREADY_EXISTS')).toBe('conflict');
    });

    it('should classify VALIDATION codes', () => {
      expect(classifyErrorCode('VALIDATION_ERROR')).toBe('validation');
      expect(classifyErrorCode('INVALID_INPUT')).toBe('validation');
    });

    it('should classify SERVER codes', () => {
      expect(classifyErrorCode('INTERNAL_ERROR')).toBe('server');
      expect(classifyErrorCode('SERVER_ERROR')).toBe('server');
    });

    it('should return undefined for unknown codes', () => {
      expect(classifyErrorCode('UNKNOWN_CODE')).toBeUndefined();
      expect(classifyErrorCode(undefined)).toBeUndefined();
    });

    it('should be case-insensitive', () => {
      expect(classifyErrorCode('unauthorized')).toBe('unauthorized');
      expect(classifyErrorCode('Forbidden')).toBe('forbidden');
    });
  });

  describe('classifyStatus', () => {
    it('should classify 401 as unauthorized', () => {
      expect(classifyStatus(401)).toBe('unauthorized');
    });

    it('should classify 403 as forbidden', () => {
      expect(classifyStatus(403)).toBe('forbidden');
    });

    it('should classify 404 as not_found', () => {
      expect(classifyStatus(404)).toBe('not_found');
    });

    it('should classify 409 as conflict', () => {
      expect(classifyStatus(409)).toBe('conflict');
    });

    it('should classify 4xx as validation', () => {
      expect(classifyStatus(400)).toBe('validation');
      expect(classifyStatus(422)).toBe('validation');
      expect(classifyStatus(429)).toBe('validation');
    });

    it('should classify 5xx as server', () => {
      expect(classifyStatus(500)).toBe('server');
      expect(classifyStatus(502)).toBe('server');
      expect(classifyStatus(503)).toBe('server');
    });

    it('should classify undefined status as network', () => {
      expect(classifyStatus(undefined)).toBe('network');
    });

    it('should classify unknown status as unknown', () => {
      expect(classifyStatus(200)).toBe('unknown');
      expect(classifyStatus(300)).toBe('unknown');
    });
  });
});

describe('ApiRoutes - Typed endpoint map', () => {
  describe('auth routes', () => {
    it('should login successfully', async () => {
      server.use(
        http.post(`${BASE_URL}/auth/login`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json(mockAuthResponse);
        })
      );

      const result = await ApiRoutes.auth.login(mockLoginRequest);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.accessToken).toBeDefined();
        expect(result.data.user?.email).toBe('student@example.com');
      }
    });

    it('should handle login failure', async () => {
      server.use(
        http.post(`${BASE_URL}/auth/login`, () => {
          return HttpResponse.json(
            { message: 'Invalid credentials' },
            { status: 401 }
          );
        })
      );

      const result = await ApiRoutes.auth.login(mockLoginRequest);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('unauthorized');
      }
    });

    it('should logout successfully', async () => {
      server.use(
        http.post(`${BASE_URL}/auth/logout`, () => {
          return HttpResponse.json({ success: true });
        })
      );

      const result = await ApiRoutes.auth.logout();

      expect(result.ok).toBe(true);
    });
  });

  describe('users routes', () => {
    it('should fetch current user profile', async () => {
      server.use(
        http.get(`${BASE_URL}/users/me`, () => {
          return HttpResponse.json(mockStudent);
        })
      );

      const result = await ApiRoutes.users.me();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('user-1');
        expect(result.data.email).toBe('student@example.com');
      }
    });

    it('should handle unauthorized access to /users/me', async () => {
      server.use(
        http.get(`${BASE_URL}/users/me`, () => {
          return HttpResponse.json(
            { message: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      const result = await ApiRoutes.users.me();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('unauthorized');
      }
    });
  });

  describe('courses routes', () => {
    it('should list courses without query params', async () => {
      server.use(
        http.get(`${BASE_URL}/courses`, () => {
          return HttpResponse.json({
            data: mockCourses,
            total: mockCourses.length,
            page: 1,
            limit: 20,
          });
        })
      );

      const result = await ApiRoutes.courses.list();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.data).toHaveLength(3);
        expect(result.data.total).toBe(3);
      }
    });

    it('should list courses with query params', async () => {
      server.use(
        http.get(`${BASE_URL}/courses`, ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          const limit = url.searchParams.get('limit');
          
          return HttpResponse.json({
            data: mockCourses.slice(0, 2),
            total: mockCourses.length,
            page: Number(page),
            limit: Number(limit),
          });
        })
      );

      const result = await ApiRoutes.courses.list({ page: 2, limit: 2 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(2);
      }
    });

    it('should get a single course by id', async () => {
      server.use(
        http.get(`${BASE_URL}/courses/course-1`, () => {
          return HttpResponse.json(mockBeginnerCourse);
        })
      );

      const result = await ApiRoutes.courses.get('course-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('course-1');
        expect(result.data.title).toBe('Blockchain Basics');
      }
    });

    it('should handle course not found', async () => {
      server.use(
        http.get(`${BASE_URL}/courses/nonexistent`, () => {
          return HttpResponse.json(
            { message: 'Course not found' },
            { status: 404 }
          );
        })
      );

      const result = await ApiRoutes.courses.get('nonexistent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('not_found');
      }
    });

    it('should create a course', async () => {
      server.use(
        http.post(`${BASE_URL}/courses`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json(
            { id: 'new-course', ...body },
            { status: 201 }
          );
        })
      );

      const payload = {
        title: 'New Course',
        description: 'A new course',
      };
      const result = await ApiRoutes.courses.create(payload);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('new-course');
        expect(result.data.title).toBe('New Course');
      }
    });

    it('should update a course', async () => {
      server.use(
        http.patch(`${BASE_URL}/courses/course-1`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            ...mockBeginnerCourse,
            ...body,
          });
        })
      );

      const updates = { title: 'Updated Title' };
      const result = await ApiRoutes.courses.update('course-1', updates);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.title).toBe('Updated Title');
      }
    });

    it('should delete a course', async () => {
      server.use(
        http.delete(`${BASE_URL}/courses/course-1`, () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await ApiRoutes.courses.remove('course-1');

      expect(result.ok).toBe(true);
    });
  });
});

describe('ApiResult type narrowing', () => {
  it('should narrow ApiSuccess type', async () => {
    server.use(
      http.get(`${BASE_URL}/data`, () => {
        return HttpResponse.json({ value: 42 });
      })
    );

    const result = await apiClient.get<{ value: number }>('/data');

    if (result.ok) {
      // TypeScript should know result.data exists here
      const value: number = result.data.value;
      expect(value).toBe(42);
    } else {
      throw new Error('Should not reach here');
    }
  });

  it('should narrow ApiError type', async () => {
    server.use(
      http.get(`${BASE_URL}/error`, () => {
        return HttpResponse.json(
          { message: 'Error occurred' },
          { status: 400 }
        );
      })
    );

    const result = await apiClient.get('/error');

    if (!result.ok) {
      // TypeScript should know result.error exists here
      const errorMessage: string = result.error.message;
      const errorKind = result.error.kind;
      expect(errorMessage).toBe('Error occurred');
      expect(errorKind).toBe('validation');
    } else {
      throw new Error('Should not reach here');
    }
  });
});
