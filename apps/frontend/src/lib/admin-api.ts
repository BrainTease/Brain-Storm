/**
 * Admin API helpers — migrated to typed apiClient (#969)
 *
 * All exported functions return `ApiResult<T>` for consistent error handling.
 */

import apiClient, { type ApiResult } from './apiClient';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  isBanned: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface AdminCourse {
  id: string;
  title: string;
  level: string;
  durationHours: number;
  isPublished: boolean;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalCredentials: number;
  totalBstMinted: number;
}

export interface DashboardMetrics {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalCompletions: number;
  completionRate: number;
  averageRating: number;
  totalReviews: number;
  activeLearnersLast30Days: number;
  newUsersLast30Days: number;
  newEnrollmentsLast30Days: number;
  growth: number;
  activeWorkers: number;
  tipVolume: number;
  disputeRate: number;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function fetchAdminStats(): Promise<ApiResult<AdminStats>> {
  const [usersRes, coursesRes, credsRes] = await Promise.all([
    apiClient.get<{ meta: { total: number } }>('/admin/users?limit=1'),
    apiClient.get<{ total: number }>('/courses?limit=1'),
    apiClient.get<{ totalCredentials: number; totalBstMinted: number }>('/admin/stats'),
  ]);

  return {
    ok: true,
    data: {
      totalUsers: usersRes.ok ? (usersRes.data?.meta?.total ?? 0) : 0,
      totalCourses: coursesRes.ok ? (coursesRes.data?.total ?? 0) : 0,
      totalCredentials: credsRes.ok ? (credsRes.data?.totalCredentials ?? 0) : 0,
      totalBstMinted: credsRes.ok ? (credsRes.data?.totalBstMinted ?? 0) : 0,
    },
  };
}

// ── Users ─────────────────────────────────────────────────────────────────────

export function fetchAdminUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}): Promise<
  ApiResult<{ data: AdminUser[]; meta: { total: number; page: number; totalPages: number } }>
> {
  return apiClient.get('/admin/users', { params });
}

export function changeUserRole(id: string, role: string): Promise<ApiResult<AdminUser>> {
  return apiClient.patch(`/admin/users/${id}/role`, { role });
}

export function banUser(id: string, isBanned: boolean): Promise<ApiResult<AdminUser>> {
  return apiClient.patch(`/admin/users/${id}/ban`, { isBanned });
}

export function deleteUser(id: string): Promise<ApiResult<void>> {
  return apiClient.delete(`/admin/users/${id}`);
}

// ── Courses ───────────────────────────────────────────────────────────────────

export function fetchAdminCourses(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ApiResult<{ data: AdminCourse[]; total: number }>> {
  return apiClient.get('/courses', { params });
}

export function togglePublish(id: string, isPublished: boolean): Promise<ApiResult<AdminCourse>> {
  return apiClient.patch(`/courses/${id}`, { isPublished });
}

export function deleteCourse(id: string): Promise<ApiResult<void>> {
  return apiClient.delete(`/courses/${id}`);
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export function fetchDashboardMetrics(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<ApiResult<DashboardMetrics>> {
  return apiClient.get<DashboardMetrics>('/admin/analytics/dashboard', { params });
}
