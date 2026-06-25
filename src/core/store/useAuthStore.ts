import { create } from 'zustand';
import type { AuthState } from '../types/auth.types';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  current_studio_id: null,
  membership: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      role: user?.membership?.role ?? user?.profile?.role ?? user?.user_metadata?.role ?? null,
      current_studio_id: user?.membership?.studio_id ?? null,
      membership: user?.membership ?? null
    }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () =>
    set({ user: null, role: null, isAuthenticated: false, current_studio_id: null, membership: null }),
  getCurrentStudioId: () => get().current_studio_id
}));
