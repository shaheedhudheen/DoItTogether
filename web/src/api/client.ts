import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { queryClient } from '../lib/queryClient';

const API_BASE = 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  // Required so the httpOnly refresh-token cookie is sent and stored
  // (API and web app must be same-site).
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Single-flight refresh: many requests 401 at once (parallel queries on page
 * load), but the refresh token is single-use (rotation) — concurrent refresh
 * calls would race and the losers would wrongly log the user out. All
 * concurrent 401s therefore share ONE refresh promise.
 *
 * On failure we retry once before giving up: a second browser tab may have
 * just rotated the cookie, and the fresh cookie from its response will work.
 */
let refreshPromise: Promise<string | null> | null = null;

const requestNewAccessToken = async (): Promise<string | null> => {
  const attempt = async (): Promise<string | null> => {
    const legacyRefreshToken = useAuthStore.getState().refreshToken;
    const { data } = await axios.post(
      `${API_BASE}/auth/refresh`,
      legacyRefreshToken ? { refreshToken: legacyRefreshToken } : {},
      { withCredentials: true }
    );
    const newAccessToken: string = data.data.tokens.accessToken;
    useAuthStore.getState().setTokens(newAccessToken, data.data.tokens.refreshToken ?? null);
    return newAccessToken;
  };

  try {
    return await attempt();
  } catch (firstError: any) {
    // Benign race with another tab: retry once with whatever cookie is now set.
    if (firstError?.response?.status === 401) {
      try {
        return await attempt();
      } catch {
        /* fall through to logout */
      }
    }
    useAuthStore.getState().logout();
    // Don't keep the previous session's personal data in memory after a
    // forced logout (expired/revoked refresh session).
    queryClient.clear();
    return null;
  }
};

const getRefreshedAccessToken = (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = requestNewAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthUrl =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/logout');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthUrl) {
      originalRequest._retry = true;

      const newAccessToken = await getRefreshedAccessToken();
      if (!newAccessToken) {
        return Promise.reject(error);
      }
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
