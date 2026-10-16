import apiClient from './client';
import { RegisterInput, LoginInput, UpdateProfileInput, ApiResponse, LoginResponse, RegisterResponse, User } from '@dit/shared';

export const authApi = {
  register: async (data: RegisterInput) => {
    const response = await apiClient.post<ApiResponse<RegisterResponse>>('/auth/register', data);
    return response.data.data;
  },
  login: async (data: LoginInput) => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data);
    return response.data.data;
  },
  getMe: async () => {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data.data.user;
  },
  updateProfile: async (data: UpdateProfileInput) => {
    const response = await apiClient.patch<ApiResponse<{ user: User }>>('/auth/profile', data);
    return response.data.data.user;
  },
  logout: async () => {
    // Revokes this device's refresh session server-side and clears the cookie.
    await apiClient.post('/auth/logout');
  },
};
