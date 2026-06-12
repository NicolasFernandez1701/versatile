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
    console.log('[Auth] Buscando perfil para:', userId);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Auth] Error al cargar perfil:', JSON.stringify(error));
      set({ profile: null, loading: false });
      return;
    }

    if (!data) {
      console.warn('[Auth] Perfil no encontrado. Intentando crear perfil vacío...');
      // Si no existe perfil, lo creamos con datos mínimos desde la sesión
      const session = get().session;
      if (session?.user) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
            role: session.user.user_metadata?.role || 'student',
            email: session.user.email,
            phone: session.user.user_metadata?.phone || null,
          })
          .select()
          .single();

        if (insertError) {
          console.error('[Auth] No se pudo crear el perfil:', JSON.stringify(insertError));
          set({ profile: null, loading: false });
        } else {
          console.log('[Auth] Perfil creado automáticamente:', newProfile);
          set({ profile: newProfile, loading: false });
        }
      } else {
        set({ profile: null, loading: false });
      }
      return;
    }

    console.log('[Auth] Perfil cargado correctamente. Rol:', data.role);
    set({ profile: data, loading: false });
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
