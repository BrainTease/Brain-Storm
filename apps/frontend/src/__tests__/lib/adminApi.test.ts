import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
/**
 * Unit tests for adminApi.ts
 * 
 * Tests the admin API module covering platform stats, activity, users,
 * course approval, and health checks with comprehensive error handling.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

import { adminApi } from '@/lib/adminApi';

import {
  mockPlatformStats,
  mockActivityEvents,
  mockAdminUsers,
  mockPendingCourses,
  mockHealthStatus,
  mockDegradedHealthStatus,
} from '../fixtures';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// MSW server setup
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('adminApi - Platform Stats', () => {
  describe('getStats', () => {
    it('should fetch platform statistics', async () => {
      server.use(
        http.get(`${BASE_URL}/admin/stats`, () => {
          return HttpResponse.json(mockPlatformStats);
        })
      );

      const stats = await adminApi.getStats();

      expect(stats.totalUsers).toBe(1250);
      expect(stats.totalCourses).toBe(48);
      expect(stats.totalRevenue).toBe(125000);
    });

    it('should handle 403 when user is not admin', async () => {
      server.use(
        http.get(`${BASE_URL}/admin/stats`, () => {
          return HttpResponse.json(
            { message: 'Admin access required' },
            { status: 403 }
          );
        })
      );

      await expect(adminApi.getStats()).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      server.use(
        http.get(`${BASE_URL}/admin/stats`, () => {
          return HttpResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      await expect(adminApi.getStats()).rejects.toThrow();
    });
  });
});

describe('adminApi - Activity', () => {
  describe('getActivity', () => {
    it('should fetch recent activity events', async () => {
      server.use(
        http.get(`${BASE_URL}/admin/activity`, () => {
          return HttpResponse.json(mockActivityEvents);
        })
      );

      const activity = await adminApi.getActivity();

      expect(activity).toHaveLength(3);
      expect(activity[0].type).toBe('enrollment');
      expect(activity[1].type).toBe('completion');
      expect(activity[2].type).toBe('new_user');
    });

    it('should handle empty activity list', async () => {
      server.use(
        http.get(`${BASE_URL}/admin/activity`, () => {
          return HttpResponse.json([]);
        })
      );

      const activity = await adminApi.getActivity();

      expect(activity).toHaveLength(0);
    });

    it('should handle 403 when user is not admin', async () => {
      server.use(
        http.get(`${BASE_URL}/admin/activity`, () => {
          return HttpResponse.json(
            { message: 'Admin access required' },
            { status: 403 }
          );
        })
      );

      await expect(adminApi.getActivity()).rejects.toThrow();
    });
  });
});

describe('adminApi - Users', () => {
  describe('getUsers', () => {
    it('should fetch paginated users list', async () => {
      server.use(
        http.get(`${BASE_URL}/admin/users`, ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          
          return HttpResponse.json({
            users: mockAdminUsers,
            total: 2,
          });
        })
      );

      const result = await adminApi.getUsers(1);

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.users[0].role).toBe('student');
      expect(result.users[1].role).toBe('instructor');
    });

    it('should search users by query', async () => {
      server.use(
        http.get(`${BASE_URL}/admin/users`, ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search');
          
          return HttpResponse.json({
            users: mockAdminUsers.filter(u => 
              u.email.includes(search || '') || u.displayName.includes(search || '')
            ),
            total: 1,
          });
        })
      );

      const result = await adminApi.getUsers(1, 'student');

      expect(result.users).toHaveLength(1);
      expect(result.users[0].email).toContain('student');
    });

    it('should handle empty search results', async () => {
      server.use(
        http.get(`${BASE_URL}/admin/users`, () => {
          return HttpResponse.json({
            users: [],
            total: 0,
          });
        })
      );

      const result = await adminApi.getUsers(1, 'nonexistent');

      expect(result.users).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle 403 when user is not admin', async () => {
      server.use(
        http.get(`${BASE_URL}/admin/users`, () => {
          return HttpResponse.json(
            { message: 'Admin access required' },
            { status: 403 }
          );
        })
      );

      await expect(adminApi.getUsers(1)).rejects.toThrow();
    });
  });

  describe('banUser', () => {
    it('should ban a user', async () => {
      server.use(
        http.post(`${BASE_URL}/admin/users/user-1/ban`, () => {
          return HttpResponse.json({
            message: 'User banned successfully',
            userId: 'user-1',
          });
        })
      );

      const result = await adminApi.banUser('user-1');

      expect(result.userId).toBe('user-1');
    });

    it('should handle user not found', async () => {
      server.use(
        http.post(`${BASE_URL}/admin/users/nonexistent/ban`, () => {
          return HttpResponse.json(
            { message: 'User not found' },
            { status: 404 }
          );
        })
      );

      await expect(adminApi.banUser('nonexistent')).rejects.toThrow();
    });

    it('should handle 403 when user is not admin', async () => {
      server.use(
        http.post(`${BASE_URL}/admin/users/user-1/ban`, () => {
          return HttpResponse.json(
            { message: 'Admin access required' },
            { status: 403 }
          );
        })
      );

      await expect(adminApi.banUser('user-1')).rejects.toThrow();
    });

    it('should handle already banned user', async () => {
      server.use(
        http.post(`${BASE_URL}/admin/users/user-1/ban`, () => {
          return HttpResponse.json(
            { message: 'User is already banned' },
            { status: 409 }
          );
        })
      );

      await expect(adminApi.banUser('user-1')).rejects.toThrow();
    });
  });

  describe('updateUserRole', () => {
    it('should update user role to instructor', async () => {
      server.use(
        http.patch(`${BASE_URL}/admin/users/user-1/role`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            id: 'user-1',
            role: body.role,
          });
        })
      );

      const result = await adminApi.updateUserRole('user-1', 'instructor');

      expect(result.role).toBe('instructor');
    });

    it('should update user role to admin', async () => {
      server.use(
        http.patch(`${BASE_URL}/admin/users/user-1/role`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            id: 'user-1',
            role: body.role,
          });
        })
      );

      const result = await adminApi.updateUserRole('user-1', 'admin');

      expect(result.role).toBe('admin');
    });

    it('should update user role to student', async () => {
      server.use(
        http.patch(`${BASE_URL}/admin/users/user-2/role`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            id: 'user-2',
            role: body.role,
          });
        })
      );

      const result = await adminApi.updateUserRole('user-2', 'student');

      expect(result.role).toBe('student');
    });

    it('should handle user not found', async () => {
      server.use(
        http.patch(`${BASE_URL}/admin/users/nonexistent/role`, () => {
          return HttpResponse.json(
            { message: 'User not found' },
            { status: 404 }
          );
        })
      );

      await expect(adminApi.updateUserRole('nonexistent', 'instructor')).rejects.toThrow();
    });

    it('should handle 403 when user is not admin', async () => {
      server.use(
        http.patch(`${BASE_URL}/admin/users/user-1/role`, () => {
          return HttpResponse.json(
            { message: 'Admin access required' },
            { status: 403 }
          );
        })
      );

      await expect(adminApi.updateUserRole('user-1', 'instructor')).rejects.toThrow();
    });

    it('should handle validation errors', async () => {
      server.use(
        http.patch(`${BASE_URL}/admin/users/user-1/role`, () => {
          return HttpResponse.json(
            { message: 'Invalid role' },
            { status: 400 }
          );
        })
      );

      await expect(adminApi.updateUserRole('user-1', 'student')).rejects.toThrow();
    });
  });
});

describe('adminApi - Courses', () => {
  describe('getPendingCourses', () => {
    it('should fetch pending courses for approval', async () => {
      server.use(
        http.get(`${BASE_URL}/admin/courses/pending`, () => {
          return HttpResponse.json(mockPendingCourses);
        })
      );

      const courses = await adminApi.getPendingCourses();

      expect(courses).toHaveLength(1);
      expect(courses[0].title).toBe('Introduction to DeFi');
      expect(courses[0].instructorName).toBe('Jane Doe');
    });

    it('should handle no pending courses', async () => {
      server.use(
        http.get(`${BASE_URL}/admin/courses/pending`, () => {
          return HttpResponse.json([]);
        })
      );

      const courses = await adminApi.getPendingCourses();

      expect(courses).toHaveLength(0);
    });

    it('should handle 403 when user is not admin', async () => {
      server.use(
        http.get(`${BASE_URL}/admin/courses/pending`, () => {
          return HttpResponse.json(
            { message: 'Admin access required' },
            { status: 403 }
          );
        })
      );

      await expect(adminApi.getPendingCourses()).rejects.toThrow();
    });
  });

  describe('approveCourse', () => {
    it('should approve a pending course', async () => {
      server.use(
        http.post(`${BASE_URL}/admin/courses/course-1/approve`, () => {
          return HttpResponse.json({
            message: 'Course approved',
            courseId: 'course-1',
          });
        })
      );

      const result = await adminApi.approveCourse('course-1');

      expect(result.courseId).toBe('course-1');
    });

    it('should handle course not found', async () => {
      server.use(
        http.post(`${BASE_URL}/admin/courses/nonexistent/approve`, () => {
          return HttpResponse.json(
            { message: 'Course not found' },
            { status: 404 }
          );
        })
      );

      await expect(adminApi.approveCourse('nonexistent')).rejects.toThrow();
    });

    it('should handle already approved course', async () => {
      server.use(
        http.post(`${BASE_URL}/admin/courses/course-1/approve`, () => {
          return HttpResponse.json(
            { message: 'Course is already approved' },
            { status: 409 }
          );
        })
      );

      await expect(adminApi.approveCourse('course-1')).rejects.toThrow();
    });

    it('should handle 403 when user is not admin', async () => {
      server.use(
        http.post(`${BASE_URL}/admin/courses/course-1/approve`, () => {
          return HttpResponse.json(
            { message: 'Admin access required' },
            { status: 403 }
          );
        })
      );

      await expect(adminApi.approveCourse('course-1')).rejects.toThrow();
    });
  });

  describe('rejectCourse', () => {
    it('should reject a pending course with reason', async () => {
      server.use(
        http.post(`${BASE_URL}/admin/courses/course-1/reject`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            message: 'Course rejected',
            courseId: 'course-1',
            reason: body.reason,
          });
        })
      );

      const result = await adminApi.rejectCourse('course-1', 'Incomplete content');

      expect(result.courseId).toBe('course-1');
      expect(result.reason).toBe('Incomplete content');
    });

    it('should handle course not found', async () => {
      server.use(
        http.post(`${BASE_URL}/admin/courses/nonexistent/reject`, () => {
          return HttpResponse.json(
            { message: 'Course not found' },
            { status: 404 }
          );
        })
      );

      await expect(adminApi.rejectCourse('nonexistent', 'Bad')).rejects.toThrow();
    });

    it('should handle validation error when reason is missing', async () => {
      server.use(
        http.post(`${BASE_URL}/admin/courses/course-1/reject`, () => {
          return HttpResponse.json(
            { message: 'Reason is required' },
            { status: 400 }
          );
        })
      );

      await expect(adminApi.rejectCourse('course-1', '')).rejects.toThrow();
    });

    it('should handle 403 when user is not admin', async () => {
      server.use(
        http.post(`${BASE_URL}/admin/courses/course-1/reject`, () => {
          return HttpResponse.json(
            { message: 'Admin access required' },
            { status: 403 }
          );
        })
      );

      await expect(adminApi.rejectCourse('course-1', 'Bad')).rejects.toThrow();
    });
  });
});

describe('adminApi - Health', () => {
  describe('getHealth', () => {
    it('should fetch health status when all services are OK', async () => {
      server.use(
        http.get(`${BASE_URL}/health`, () => {
          return HttpResponse.json(mockHealthStatus);
        })
      );

      const health = await adminApi.getHealth();

      expect(health.api).toBe('ok');
      expect(health.database).toBe('ok');
      expect(health.stellar).toBe('ok');
    });

    it('should fetch health status when database is degraded', async () => {
      server.use(
        http.get(`${BASE_URL}/health`, () => {
          return HttpResponse.json(mockDegradedHealthStatus);
        })
      );

      const health = await adminApi.getHealth();

      expect(health.api).toBe('ok');
      expect(health.database).toBe('degraded');
      expect(health.stellar).toBe('ok');
    });

    it('should fetch health status when service is down', async () => {
      server.use(
        http.get(`${BASE_URL}/health`, () => {
          return HttpResponse.json({
            api: 'ok',
            database: 'ok',
            stellar: 'down',
          });
        })
      );

      const health = await adminApi.getHealth();

      expect(health.stellar).toBe('down');
    });

    it('should handle server errors', async () => {
      server.use(
        http.get(`${BASE_URL}/health`, () => {
          return HttpResponse.json(
            { message: 'Health check failed' },
            { status: 500 }
          );
        })
      );

      await expect(adminApi.getHealth()).rejects.toThrow();
    });

    it('should be accessible without authentication', async () => {
      // Health endpoint should be public
      server.use(
        http.get(`${BASE_URL}/health`, () => {
          return HttpResponse.json(mockHealthStatus);
        })
      );

      const health = await adminApi.getHealth();

      expect(health).toBeDefined();
      expect(health.api).toBe('ok');
    });
  });
});

describe('adminApi - Error handling', () => {
  it('should handle network errors', async () => {
    server.use(
      http.get(`${BASE_URL}/admin/stats`, () => {
        return HttpResponse.error();
      })
    );

    await expect(adminApi.getStats()).rejects.toThrow();
  });

  it('should handle unauthorized requests (401)', async () => {
    server.use(
      http.get(`${BASE_URL}/admin/stats`, () => {
        return HttpResponse.json(
          { message: 'Unauthorized' },
          { status: 401 }
        );
      })
    );

    await expect(adminApi.getStats()).rejects.toThrow();
  });

  it('should handle rate limiting (429)', async () => {
    server.use(
      http.post(`${BASE_URL}/admin/users/user-1/ban`, () => {
        return HttpResponse.json(
          { message: 'Too many requests' },
          { status: 429 }
        );
      })
    );

    await expect(adminApi.banUser('user-1')).rejects.toThrow();
  });

  it('should handle service unavailable (503)', async () => {
    server.use(
      http.get(`${BASE_URL}/admin/activity`, () => {
        return HttpResponse.json(
          { message: 'Service unavailable' },
          { status: 503 }
        );
      })
    );

    await expect(adminApi.getActivity()).rejects.toThrow();
  });
});
