import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  '/api';

export const api = axios.create({
  baseURL: apiBase,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nodo360_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
