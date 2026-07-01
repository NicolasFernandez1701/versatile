import type { User } from '@supabase/supabase-js';

export type Role = 'admin' | 'teacher' | 'student';

export interface StudioMembership {
  studio_id: string;
  studio_name: string;
  role: Role;
}

export interface AppUser extends User {
  profile?: {
    role: Role;
    has_completed_onboarding: boolean;
    full_name?: string;
  };
  membership?: StudioMembership | null;
  memberships?: StudioMembership[] | null;
}

export interface AuthState {
  user: AppUser | null;
  role: Role | null;
  activeRole: Role | null;
  current_studio_id: string | null;
  membership: StudioMembership | null;
  memberships: StudioMembership[];
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AppUser | null) => void;
  setRole: (role: Role | null) => void;
  setActiveRole: (role: Role) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
  getCurrentStudioId: () => string | null;
}
