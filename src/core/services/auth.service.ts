import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';
import type { StudioMembership, AppUser } from '../types/auth.types';

async function fetchMemberships(userId: string): Promise<StudioMembership[]> {
  const { data } = await supabase
    .from('studio_members')
    .select('studio_id, role, studios(name)')
    .eq('user_id', userId);

  if (!data || data.length === 0) return [];

  return (data as unknown as { studio_id: string; role: StudioMembership['role']; studios: { name: string } | null }[]).map((row) => ({
    studio_id: row.studio_id,
    studio_name: row.studios?.name ?? '',
    role: row.role
  }));
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

  async getCurrentUser(): Promise<AppUser | null> {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error || !session?.user) return null;

    // Fetch extra profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('has_completed_onboarding, role, full_name')
      .eq('id', session.user.id)
      .maybeSingle();

    const memberships = await fetchMemberships(session.user.id);

    return {
      ...session.user,
      profile: (profile as AppUser['profile']) ?? undefined,
      membership: memberships[0] ?? null,
      memberships
    } as AppUser;
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

      const memberships = await fetchMemberships(session.user.id);

      const enrichedSession = {
        ...session,
        user: {
          ...session.user,
          profile: (profile as AppUser['profile']) ?? undefined,
          membership: memberships[0] ?? null,
          memberships
        } as AppUser
      };

      callback(enrichedSession);
    });
  }
};
