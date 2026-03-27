import axios from 'axios';
import { toast } from './toast';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window === 'undefined') return Promise.reject(error);

    const status = error?.response?.status;

    if (status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const message: string =
      error?.response?.data?.message ??
      error?.response?.data?.error ??
      error?.message ??
      'An unexpected error occurred.';

    // Don't double-toast for errors callers handle themselves (they can catch before this runs)
    toast.error(typeof message === 'string' ? message : JSON.stringify(message));

    return Promise.reject(error);
  },
);

export default api;
