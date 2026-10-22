import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { LoginInput, RegisterInput, UpdateProfileInput, User } from '@dit/shared';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const { setAuth, logout: storeLogout, user, isAuthenticated } = useAuthStore();

  // Best-effort server-side revocation of the refresh session, then clear
  // local state. (The interceptor's failure-path logout intentionally skips
  // this — the server already rejected the session.)
  const logout = () => {
    authApi.logout().catch(() => {});
    storeLogout();
    // Drop every cached query from the previous account. Without this, the
    // next account could briefly render the previous user's data.
    queryClient.clear();
  };

  // A new session must never reuse cached data from a previous account.
  // Only /me is seeded; the partnership query is left to fetch the full room
  // record (including both member profiles) on mount.
  const startSession = (nextUser: User) => {
    queryClient.removeQueries();
    queryClient.setQueryData(['me'], nextUser);
  };

  const login = useMutation({
    mutationFn: (data: LoginInput) => authApi.login(data),
    onSuccess: (data) => {
      startSession(data.user);
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
      // Brand-new account: no partnership and no inherited room settings.
      startSession(data.user);
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
      // The API returns the definitive user row, so there is no stale cache
      // window here (which previously leaked the previous user's name).
      queryClient.setQueryData(['me'], data);
      queryClient.invalidateQueries({ queryKey: ['partnership'] });
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
