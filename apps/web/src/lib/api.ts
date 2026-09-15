import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  '/api';

export const api = axios.create({
  baseURL: apiBase,
});

function dropContentType(headers: unknown) {
  const value = headers as { delete?: (name: string) => void } & Record<string, unknown>;
  if (!value) return;
  if (typeof value.delete === 'function') {
    value.delete('Content-Type');
    value.delete('content-type');
    return;
  }
  delete value['Content-Type'];
  delete value['content-type'];
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nodo360_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const isForm = typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (isForm) {
    dropContentType(config.headers);
  } else if (config.data && typeof config.data === 'object') {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/') {
        localStorage.removeItem('nodo360_token');
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
