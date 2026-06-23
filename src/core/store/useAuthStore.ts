import { create } from 'zustand';
import type { AuthState } from '../types/auth.types';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      role: user?.profile?.role || user?.user_metadata?.role || null
    }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, role: null, isAuthenticated: false })
}));
