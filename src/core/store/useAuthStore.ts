import { create } from 'zustand';
import type { AuthState } from '../types/auth.types';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  activeRole: null,
  current_studio_id: null,
  membership: null,
  memberships: [],
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => {
    const memberships = user?.memberships ?? (user?.membership ? [user.membership] : []);
    const firstMembership = memberships[0] ?? null;

    set({
      user,
      isAuthenticated: !!user,
      memberships,
      activeRole: firstMembership?.role ?? null,
      role: firstMembership?.role ?? user?.profile?.role ?? user?.user_metadata?.role ?? null,
      current_studio_id: firstMembership?.studio_id ?? null,
      membership: firstMembership
    });
  },

  setRole: (role) => set({ role }),

  setActiveRole: (role) => {
    const { memberships } = get();
    const membership = memberships.find((m) => m.role === role) ?? null;

    set({
      activeRole: role,
      role,
      membership,
      current_studio_id: membership?.studio_id ?? null
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  logout: () =>
    set({
      user: null,
      role: null,
      activeRole: null,
      isAuthenticated: false,
      current_studio_id: null,
      membership: null,
      memberships: []
    }),

  getCurrentStudioId: () => get().current_studio_id
}));
