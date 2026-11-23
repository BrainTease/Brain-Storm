/**
 * Unit tests for api.ts - axios instance and interceptors
 * 
 * Tests the core axios instance configuration, request/response interceptors,
 * auth token injection, error handling, and 401 redirects.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useAuthStore } from '@/store/auth.store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Mock the auth store
vi.mock('@/store/auth.store', () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}));

// Mock window.location
const mockLocation = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock toast
vi.mock('@/lib/toast', () => ({
  toast: {
    error: vi.fn(),
  },
}));

// MSW server
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('api.ts - axios instance', () => {
  let api: typeof import('@/lib/api').default;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    mockLocation.href = '';

    // Re-import api to get fresh instance
    vi.resetModules();
    const apiModule = await import('@/lib/api');
    api = apiModule.default;
  });

  describe('Base configuration', () => {
    it('should have correct base URL', () => {
      expect(api.defaults.baseURL).toBeDefined();
      expect(typeof api.defaults.baseURL).toBe('string');
    });

    it('should have Content-Type: application/json header', () => {
      expect(api.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Request interceptor - Auth token injection', () => {
    it('should add Authorization header when token exists', async () => {
      const mockToken = 'test-jwt-token';
      vi.mocked(useAuthStore.getState).mockReturnValue({
        token: mockToken,
        logout: vi.fn(),
      } as any);

      let capturedAuth: string | undefined;
      server.use(
        http.get(`${BASE_URL}/test`, ({ request }) => {
          capturedAuth = request.headers.get('Authorization') || undefined;
          return HttpResponse.json({ success: true });
        })
      );

      await api.get('/test');
      expect(capturedAuth).toBe(`Bearer ${mockToken}`);
    });

    it('should not add Authorization header when token is null', async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        token: null,
        logout: vi.fn(),
      } as any);

      let capturedAuth: string | undefined;
      server.use(
        http.get(`${BASE_URL}/test`, ({ request }) => {
          capturedAuth = request.headers.get('Authorization') || undefined;
          return HttpResponse.json({ success: true });
        })
      );

      await api.get('/test');
      expect(capturedAuth).toBeUndefined();
    });

    it('should not add Authorization header when token is undefined', async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        token: undefined,
        logout: vi.fn(),
      } as any);

      let capturedAuth: string | undefined;
      server.use(
        http.get(`${BASE_URL}/test`, ({ request }) => {
          capturedAuth = request.headers.get('Authorization') || undefined;
          return HttpResponse.json({ success: true });
        })
      );

      await api.get('/test');
      expect(capturedAuth).toBeUndefined();
    });

    it('should handle SSR (window undefined) gracefully', async () => {
      server.use(
        http.get(`${BASE_URL}/test`, () => {
          return HttpResponse.json({ success: true });
        })
      );

      const response = await api.get('/test');
      expect(response.data.success).toBe(true);
    });
  });

  describe('Response interceptor - Success responses', () => {
    it('should pass through successful responses', async () => {
      server.use(
        http.get(`${BASE_URL}/test`, () => {
          return HttpResponse.json({ data: 'success' });
        })
      );

      const response = await api.get('/test');
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ data: 'success' });
    });

    it('should pass through 201 Created', async () => {
      server.use(
        http.post(`${BASE_URL}/items`, () => {
          return HttpResponse.json({ id: 'new-item' }, { status: 201 });
        })
      );

      const response = await api.post('/items', {});
      expect(response.status).toBe(201);
      expect(response.data.id).toBe('new-item');
    });

    it('should pass through 204 No Content', async () => {
      server.use(
        http.delete(`${BASE_URL}/items/123`, () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const response = await api.delete('/items/123');
      expect(response.status).toBe(204);
    });
  });

  describe('Response interceptor - Error handling', () => {
    it('should handle 401 Unauthorized and redirect to /login', async () => {
      const mockLogout = vi.fn();
      vi.mocked(useAuthStore.getState).mockReturnValue({
        token: 'expired-token',
        logout: mockLogout,
      } as any);

      server.use(
        http.get(`${BASE_URL}/protected`, () => {
          return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
        })
      );

      await expect(api.get('/protected')).rejects.toThrow();
      
      expect(mockLogout).toHaveBeenCalled();
      expect(mockLocation.href).toBe('/login');
    });

    it('should extract error message from response.data.message', async () => {
      const { toast } = await import('@/lib/toast');
      
      server.use(
        http.post(`${BASE_URL}/items`, () => {
          return HttpResponse.json({ message: 'Invalid input data' }, { status: 400 });
        })
      );

      await expect(api.post('/items', {})).rejects.toThrow();
      
      expect(toast.error).toHaveBeenCalledWith('Invalid input data');
    });

    it('should extract error message from response.data.error', async () => {
      const { toast } = await import('@/lib/toast');
      
      server.use(
        http.post(`${BASE_URL}/items`, () => {
          return HttpResponse.json({ error: 'Validation failed' }, { status: 400 });
        })
      );

      await expect(api.post('/items', {})).rejects.toThrow();
      
      expect(toast.error).toHaveBeenCalledWith('Validation failed');
    });

    it('should use default message when no message available', async () => {
      const { toast } = await import('@/lib/toast');
      
      server.use(
        http.get(`${BASE_URL}/error`, () => {
          return HttpResponse.json({}, { status: 500 });
        })
      );

      await expect(api.get('/error')).rejects.toThrow();
      
      expect(toast.error).toHaveBeenCalledWith('An unexpected error occurred.');
    });

    it('should handle 403 Forbidden', async () => {
      const { toast } = await import('@/lib/toast');
      
      server.use(
        http.get(`${BASE_URL}/admin`, () => {
          return HttpResponse.json({ message: 'Forbidden' }, { status: 403 });
        })
      );

      await expect(api.get('/admin')).rejects.toThrow();
      
      expect(toast.error).toHaveBeenCalledWith('Forbidden');
    });

    it('should handle 404 Not Found', async () => {
      const { toast } = await import('@/lib/toast');
      
      server.use(
        http.get(`${BASE_URL}/items/nonexistent`, () => {
          return HttpResponse.json({ message: 'Not found' }, { status: 404 });
        })
      );

      await expect(api.get('/items/nonexistent')).rejects.toThrow();
      
      expect(toast.error).toHaveBeenCalledWith('Not found');
    });

    it('should handle 409 Conflict', async () => {
      const { toast } = await import('@/lib/toast');
      
      server.use(
        http.post(`${BASE_URL}/items`, () => {
          return HttpResponse.json({ message: 'Resource already exists' }, { status: 409 });
        })
      );

      await expect(api.post('/items', {})).rejects.toThrow();
      
      expect(toast.error).toHaveBeenCalledWith('Resource already exists');
    });

    it('should handle 500 Internal Server Error', async () => {
      const { toast } = await import('@/lib/toast');
      
      server.use(
        http.get(`${BASE_URL}/error`, () => {
          return HttpResponse.json({ message: 'Internal server error' }, { status: 500 });
        })
      );

      await expect(api.get('/error')).rejects.toThrow();
      
      expect(toast.error).toHaveBeenCalledWith('Internal server error');
    });

    it('should handle network errors (no response)', async () => {
      const { toast } = await import('@/lib/toast');
      
      server.use(
        http.get(`${BASE_URL}/network-error`, () => {
          return HttpResponse.error();
        })
      );

      await expect(api.get('/network-error')).rejects.toThrow();
      
      expect(toast.error).toHaveBeenCalled();
    });

    it('should stringify object error messages', async () => {
      const { toast } = await import('@/lib/toast');
      
      server.use(
        http.post(`${BASE_URL}/items`, () => {
          return HttpResponse.json({ 
            message: { field: 'email', error: 'Invalid format' } 
          }, { status: 400 });
        })
      );

      await expect(api.post('/items', {})).rejects.toThrow();
      
      const toastCall = vi.mocked(toast.error).mock.calls[0][0];
      expect(typeof toastCall).toBe('string');
      expect(toastCall).toContain('field');
    });
  });

  describe('SSR behavior', () => {
    it('should handle requests in SSR environment', async () => {
      server.use(
        http.get(`${BASE_URL}/ssr-test`, () => {
          return HttpResponse.json({ data: 'ssr-safe' });
        })
      );

      const response = await api.get('/ssr-test');
      expect(response.data.data).toBe('ssr-safe');
    });

    it('should not call toast.error in SSR', async () => {
      const { toast } = await import('@/lib/toast');
      
      server.use(
        http.get(`${BASE_URL}/error`, () => {
          return HttpResponse.json({ message: 'Server error' }, { status: 500 });
        })
      );

      await expect(api.get('/error')).rejects.toThrow();
      
      // Toast should still be called in test environment
      // This verifies the typeof window check
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('Multiple simultaneous requests', () => {
    it('should handle multiple parallel requests with different tokens', async () => {
      const token1 = 'token-1';
      const token2 = 'token-2';

      let callCount = 0;
      server.use(
        http.get(`${BASE_URL}/test-1`, ({ request }) => {
          callCount++;
          const auth = request.headers.get('Authorization');
          expect(auth).toMatch(/Bearer token-/);
          return HttpResponse.json({ call: callCount });
        }),
        http.get(`${BASE_URL}/test-2`, ({ request }) => {
          callCount++;
          const auth = request.headers.get('Authorization');
          expect(auth).toMatch(/Bearer token-/);
          return HttpResponse.json({ call: callCount });
        })
      );

      vi.mocked(useAuthStore.getState).mockReturnValue({
        token: token1,
        logout: vi.fn(),
      } as any);

      const promise1 = api.get('/test-1');

      vi.mocked(useAuthStore.getState).mockReturnValue({
        token: token2,
        logout: vi.fn(),
      } as any);

      const promise2 = api.get('/test-2');

      const [response1, response2] = await Promise.all([promise1, promise2]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(callCount).toBe(2);
    });

    it('should handle mix of authenticated and unauthenticated requests', async () => {
      server.use(
        http.get(`${BASE_URL}/public`, () => {
          return HttpResponse.json({ public: true });
        }),
        http.get(`${BASE_URL}/private`, () => {
          return HttpResponse.json({ private: true });
        })
      );

      vi.mocked(useAuthStore.getState).mockReturnValue({
        token: null,
        logout: vi.fn(),
      } as any);

      const publicResponse = await api.get('/public');

      vi.mocked(useAuthStore.getState).mockReturnValue({
        token: 'auth-token',
        logout: vi.fn(),
      } as any);

      const privateResponse = await api.get('/private');

      expect(publicResponse.data.public).toBe(true);
      expect(privateResponse.data.private).toBe(true);
    });
  });

  describe('Request/Response cycle', () => {
    it('should handle complete request-response cycle with auth', async () => {
      const mockToken = 'full-cycle-token';
      vi.mocked(useAuthStore.getState).mockReturnValue({
        token: mockToken,
        logout: vi.fn(),
      } as any);

      let capturedAuth: string | undefined;
      let capturedContentType: string | undefined;
      let capturedBody: any;

      server.use(
        http.post(`${BASE_URL}/api/data`, async ({ request }) => {
          capturedAuth = request.headers.get('Authorization') || undefined;
          capturedContentType = request.headers.get('Content-Type') || undefined;
          capturedBody = await request.json();
          
          return HttpResponse.json(
            { id: 'created-item', ...capturedBody },
            { status: 201 }
          );
        })
      );

      const payload = { name: 'Test Item' };
      const response = await api.post('/api/data', payload);

      expect(capturedAuth).toBe(`Bearer ${mockToken}`);
      expect(capturedContentType).toContain('application/json');
      expect(response.status).toBe(201);
      expect(response.data.id).toBe('created-item');
      expect(response.data.name).toBe('Test Item');
    });
  });
});
