import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../api/supabaseClient';

interface AuthState {
  session: Session | null;
  profile: any | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,

  setSession: (session) => {
    set({ session });
    if (session) {
      get().fetchProfile(session.user.id);
    } else {
      set({ profile: null, loading: false });
    }
  },

  fetchProfile: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) set({ profile: data, loading: false });
    else set({ loading: false });
  },

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session });
    if (session) {
      await get().fetchProfile(session.user.id);
    } else {
      set({ loading: false });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      get().setSession(session);
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  }
}));
