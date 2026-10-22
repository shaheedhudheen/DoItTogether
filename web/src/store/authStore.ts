import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@dit/shared';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, refreshToken?: string | null) => void;
  setTokens: (token: string, refreshToken?: string | null) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, token, refreshToken = null) =>
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true
        }),
      setTokens: (token, refreshToken = null) =>
        set({
          token,
          refreshToken
        }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      logout: () => set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'dit-auth-storage',
    }
  )
);
