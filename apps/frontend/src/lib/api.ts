import axios from 'axios';

import { getConfig } from '@/config';
import { useAuthStore } from '@/store/auth.store';

import { toast } from './toast';

const api = axios.create({
  baseURL: getConfig().apiUrl,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;
  // Read token from the persisted Zustand store (falls back gracefully if not hydrated yet)
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window === 'undefined') return Promise.reject(error);

    const status = error?.response?.status;

    if (status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const message: string =
      error?.response?.data?.message ??
      error?.response?.data?.error ??
      error?.message ??
      'An unexpected error occurred.';

    toast.error(typeof message === 'string' ? message : JSON.stringify(message));

    return Promise.reject(error);
  }
);

export default api;
