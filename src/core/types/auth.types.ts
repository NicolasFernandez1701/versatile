import type { User } from '@supabase/supabase-js';

export type Role = 'admin' | 'teacher' | 'student';

export interface AppUser extends User {
  profile?: {
    role: Role;
    has_completed_onboarding: boolean;
    full_name?: string;
  };
}

export interface AuthState {
  user: AppUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AppUser | null) => void;
  setRole: (role: Role | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}
