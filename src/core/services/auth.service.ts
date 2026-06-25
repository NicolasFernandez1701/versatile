import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';
import type { StudioMembership } from '../types/auth.types';

interface ProfileRow {
  has_completed_onboarding: boolean;
  role: 'admin' | 'teacher' | 'student';
  full_name: string | null;
}

interface StudioMemberRow {
  studio_id: string;
  role: 'admin' | 'teacher' | 'student';
  studios: {
    name: string;
  } | null;
}

async function fetchMembership(userId: string): Promise<StudioMembership | null> {
  const { data } = await supabase
    .from('studio_members')
    .select('studio_id, role, studios(name)')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;

  const row = data as unknown as StudioMemberRow;
  return {
    studio_id: row.studio_id,
    studio_name: row.studios?.name ?? '',
    role: row.role
  };
}

export const authService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async register(params: { email: string; password: string; full_name: string }) {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.full_name
        }
      }
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session?.user) return null;

    // Fetch extra profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('has_completed_onboarding, role, full_name')
      .eq('id', session.user.id)
      .maybeSingle();

    const membership = await fetchMembership(session.user.id);

    return {
      ...session.user,
      profile: (profile as ProfileRow | null) || null,
      membership
    };
  },

  // Hook para suscribirse a los cambios de sesión
  onAuthStateChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        callback(null);
        return;
      }

      // Fetch extra profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('has_completed_onboarding, role, full_name')
        .eq('id', session.user.id)
        .maybeSingle();

      const membership = await fetchMembership(session.user.id);

      const enrichedSession = {
        ...session,
        user: {
          ...session.user,
          profile: (profile as ProfileRow | null) || null,
          membership
        }
      };

      callback(enrichedSession);
    });
  }
};
