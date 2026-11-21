import axios from 'axios';
import { getToken, clearSession } from './session';

export const BACKEND_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:3000';

export const API_URL = `${BACKEND_URL}/api`;

export const getFullMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle token expiration
      clearSession();
      window.dispatchEvent(new Event('auth-expired'));
    } else if (error.response?.status === 403 && /insufficient permissions/i.test(error.response?.data?.error || '')) {
      // Role mismatch (e.g. a different account logged in from another tab):
      // ask the auth context to re-sync with the server.
      window.dispatchEvent(new Event('auth-role-mismatch'));
    }
    return Promise.reject(error);
  }
);

export default api;
