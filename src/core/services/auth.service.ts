import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

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

    return {
      ...session.user,
      profile: profile || null
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

      const enrichedSession = {
        ...session,
        user: {
          ...session.user,
          profile: profile || null
        }
      };

      callback(enrichedSession);
    });
  }
};
