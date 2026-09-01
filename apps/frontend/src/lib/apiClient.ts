/**
 * Typed API client wrapper — issue #969
 *
 * Wraps the raw axios `api` instance in a discriminated-union Result<T> shape
 * so every call site gets a consistent `{ ok, data } | { ok, error }` return
 * value instead of relying on ad-hoc try/catch + error-message extraction.
 *
 * Usage:
 *   const result = await apiClient.get<Course[]>('/courses');
 *   if (!result.ok) { console.error(result.error.message); return; }
 *   const courses = result.data;
 */

import api from './api';
import type { AxiosRequestConfig } from 'axios';

// ── Result type ───────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    message: string;
    /** HTTP status code, if the server responded */
    status?: number;
    /** Raw response body, when available */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raw?: any;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractMessage(err: unknown): string {
  if (err instanceof Error) {
    // Axios error — prefer the server's message field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosErr = err as any;
    const serverMessage: unknown =
      axiosErr?.response?.data?.message ?? axiosErr?.response?.data?.error ?? axiosErr?.message;
    if (typeof serverMessage === 'string' && serverMessage.length > 0) {
      return serverMessage;
    }
    if (typeof serverMessage === 'object' && serverMessage !== null) {
      return JSON.stringify(serverMessage);
    }
  }
  return 'An unexpected error occurred.';
}

function extractStatus(err: unknown): number | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (err as any)?.response?.status;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRaw(err: unknown): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (err as any)?.response?.data;
}

async function wrap<T>(promise: Promise<{ data: T }>): Promise<ApiResult<T>> {
  try {
    const response = await promise;
    return { ok: true, data: response.data };
  } catch (err) {
    return {
      ok: false,
      error: {
        message: extractMessage(err),
        status: extractStatus(err),
        raw: extractRaw(err),
      },
    };
  }
}

// ── Public surface ────────────────────────────────────────────────────────────

/**
 * Typed wrapper around the project's axios instance.
 *
 * Every method returns `Promise<ApiResult<T>>` — callers check `result.ok`
 * before accessing `result.data`, and never have to write try/catch.
 */
export const apiClient = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
    return wrap<T>(api.get<T>(url, config));
  },

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
    return wrap<T>(api.post<T>(url, data, config));
  },

  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
    return wrap<T>(api.patch<T>(url, data, config));
  },

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
    return wrap<T>(api.put<T>(url, data, config));
  },

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
    return wrap<T>(api.delete<T>(url, config));
  },
};

export default apiClient;
