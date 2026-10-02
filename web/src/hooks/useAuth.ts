import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { LoginInput, RegisterInput, UpdateProfileInput } from '@dit/shared';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const { setAuth, logout, user, isAuthenticated } = useAuthStore();

  const login = useMutation({
    mutationFn: (data: LoginInput) => authApi.login(data),
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      toast.success('Welcome back!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to login');
    },
  });

  const register = useMutation({
    mutationFn: (data: RegisterInput) => authApi.register(data),
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      toast.success('Account created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to register');
    },
  });

  const updateProfile = useMutation({
    mutationFn: (data: UpdateProfileInput) => authApi.updateProfile(data),
    onSuccess: (data) => {
      useAuthStore.getState().updateUser(data);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      toast.success('Profile updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const u = await authApi.getMe();
      if (u) {
        useAuthStore.getState().updateUser(u);
      }
      return u;
    },
    enabled: isAuthenticated,
  });

  return {
    login,
    register,
    updateProfile,
    logout,
    user: me || user,
    isLoading,
    isAuthenticated,
  };
};
