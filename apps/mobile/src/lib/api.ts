import axios from 'axios';
import { getSessionToken } from '../platform/session';

export const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  '/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getSessionToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message || error.message;
  }
  return error instanceof Error ? error.message : 'Error inesperado';
}
