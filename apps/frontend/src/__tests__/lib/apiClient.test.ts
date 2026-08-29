/**
 * Unit tests for the typed API client wrapper — issue #969
 *
 * ⚠️ DO NOT RUN — implementation only, per task instructions.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { apiClient, type ApiResult } from '@/lib/apiClient';

// ── Mock the raw api module ────────────────────────────────────────────────────
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '@/lib/api';

const mockApi = api as {
  get: Mock;
  post: Mock;
  patch: Mock;
  put: Mock;
  delete: Mock;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAxiosError(status: number, message: string, body?: unknown): Error {
  const err = new Error(message) as Error & {
    response: { status: number; data: { message: string } };
  };
  err.response = { status, data: { message, ...(body as object) } };
  return err;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── GET ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns ok:true with data on a successful response', async () => {
      const payload = [{ id: '1', title: 'Intro to Stellar' }];
      mockApi.get.mockResolvedValueOnce({ data: payload });

      const result = await apiClient.get<typeof payload>('/courses');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(payload);
      }
    });

    it('returns ok:false with an error message on a network failure', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Network Error'));

      const result = await apiClient.get('/courses');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Network Error');
        expect(result.error.status).toBeUndefined();
      }
    });

    it('returns ok:false with the server message and status on a 4xx response', async () => {
      mockApi.get.mockRejectedValueOnce(makeAxiosError(404, 'Course not found'));

      const result = await apiClient.get('/courses/missing');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Course not found');
        expect(result.error.status).toBe(404);
      }
    });

    it('falls back to a generic message when the server body has no message field', async () => {
      const err = new Error('Request failed with status code 500') as Error & {
        response: { status: number; data: Record<string, never> };
      };
      err.response = { status: 500, data: {} };
      mockApi.get.mockRejectedValueOnce(err);

      const result = await apiClient.get('/courses');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Request failed with status code 500');
        expect(result.error.status).toBe(500);
      }
    });
  });

  // ── POST ───────────────────────────────────────────────────────────────────

  describe('post', () => {
    it('returns ok:true with created data on success', async () => {
      const created = { id: 'abc', title: 'New course' };
      mockApi.post.mockResolvedValueOnce({ data: created });

      const result = await apiClient.post<typeof created>('/courses', { title: 'New course' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(created);
      }
    });

    it('returns ok:false with 401 status on unauthorised', async () => {
      mockApi.post.mockRejectedValueOnce(makeAxiosError(401, 'Unauthorised'));

      const result = await apiClient.post('/courses', {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(401);
      }
    });
  });

  // ── PATCH ──────────────────────────────────────────────────────────────────

  describe('patch', () => {
    it('returns ok:true with updated data on success', async () => {
      const updated = { id: 'abc', title: 'Updated title' };
      mockApi.patch.mockResolvedValueOnce({ data: updated });

      const result = await apiClient.patch<typeof updated>('/courses/abc', {
        title: 'Updated title',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.title).toBe('Updated title');
      }
    });

    it('returns ok:false on a server error', async () => {
      mockApi.patch.mockRejectedValueOnce(makeAxiosError(422, 'Validation failed'));

      const result = await apiClient.patch('/courses/abc', {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Validation failed');
        expect(result.error.status).toBe(422);
      }
    });
  });

  // ── PUT ────────────────────────────────────────────────────────────────────

  describe('put', () => {
    it('returns ok:true on success', async () => {
      const replaced = { id: 'xyz', value: 99 };
      mockApi.put.mockResolvedValueOnce({ data: replaced });

      const result = await apiClient.put<typeof replaced>('/items/xyz', replaced);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.value).toBe(99);
      }
    });
  });

  // ── DELETE ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('returns ok:true with empty data on success', async () => {
      mockApi.delete.mockResolvedValueOnce({ data: undefined });

      const result: ApiResult<void> = await apiClient.delete('/courses/abc');

      expect(result.ok).toBe(true);
    });

    it('returns ok:false with 403 status on forbidden', async () => {
      mockApi.delete.mockRejectedValueOnce(makeAxiosError(403, 'Forbidden'));

      const result = await apiClient.delete('/courses/abc');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(403);
        expect(result.error.message).toBe('Forbidden');
      }
    });
  });

  // ── Type-narrowing ergonomics ──────────────────────────────────────────────

  describe('type narrowing', () => {
    it('narrows to ApiSuccess<T> when ok is true', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { count: 7 } });

      const result = await apiClient.get<{ count: number }>('/stats');

      // TypeScript guards the .data field only when ok === true
      if (!result.ok) throw new Error('Expected ok result');
      expect(result.data.count).toBe(7);
    });

    it('narrows to ApiError when ok is false', async () => {
      mockApi.get.mockRejectedValueOnce(makeAxiosError(503, 'Service unavailable'));

      const result = await apiClient.get('/health');

      if (result.ok) throw new Error('Expected error result');
      expect(result.error.message).toBe('Service unavailable');
      expect(result.error.status).toBe(503);
    });
  });
});
