import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { getSessionToken } from '../platform/session';

const RENDER_API = 'https://nodo360-api.onrender.com/api';
const envUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

export const API_URL =
  Capacitor.isNativePlatform() && !envUrl.startsWith('http')
    ? RENDER_API
    : envUrl || RENDER_API;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 45_000,
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

api.interceptors.request.use(async (config) => {
  const token = await getSessionToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const isForm = typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (isForm) {
    dropContentType(config.headers);
  } else if (config.data && typeof config.data === 'object') {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') return 'El servidor está tardando. Reintentá en unos segundos.';
    if (!error.response) return 'Sin conexión con el servidor. Revisá datos o Wi‑Fi.';
    const status = error.response.status;
    if (status === 401 || status === 403) return 'Usuario o clave incorrectos';
    const message = error.response.data?.message;
    return Array.isArray(message) ? message.join(', ') : message || error.message;
  }
  return error instanceof Error ? error.message : 'Error inesperado';
}
