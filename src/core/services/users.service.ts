import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';
import type { UserProfile } from '../types/users.types';

// Cliente secundario para no pisar la sesión del administrador al crear usuarios
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export const usersService = {
  async getStudents(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, plans(*)')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as UserProfile[];
  },

  async getTeachers(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, classes(activity_name, teacher_commission_pct)')
      .eq('role', 'teacher')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as UserProfile[];
  },

  async createUser(payload: {
    email: string;
    full_name: string;
    phone?: string;
    role: 'student' | 'teacher';
    password?: string;
  }): Promise<void> {
    // 1. Crear en Auth (esto dispara el trigger handle_new_user en la DB)
    const { data, error } = await authClient.auth.signUp({
      email: payload.email,
      password: payload.password || 'password123', // Contraseña genérica por defecto o la provista
      options: {
        data: {
          full_name: payload.full_name,
          phone: payload.phone,
          role: payload.role
        }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error('No se pudo crear el usuario');
  },

  async updateUser(id: string, payload: Partial<UserProfile>): Promise<void> {
    const { error } = await supabase.from('profiles').update(payload).eq('id', id);

    if (error) throw error;
  },

  async updatePassword(newPassword: string): Promise<void> {
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) throw authError;
  },

  async saveOnboardingDetails(profileId: string, details: any): Promise<void> {
    // 1. Insert Student Details
    const { error: detailsError } = await supabase
      .from('student_details')
      .insert([{ profile_id: profileId, ...details }]);

    if (detailsError) throw detailsError;

    // 3. Mark Onboarding as Completed in Profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ has_completed_onboarding: true })
      .eq('id', profileId);

    if (profileError) throw profileError;
  },
  async saveTeacherOnboardingDetails(profileId: string, details: any): Promise<void> {
    const { error: detailsError } = await supabase
      .from('teacher_details')
      .insert([{ profile_id: profileId, ...details }]);

    if (detailsError) throw detailsError;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ has_completed_onboarding: true })
      .eq('id', profileId);

    if (profileError) throw profileError;
  },

  async getSpecialties(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
      .from('specialties')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  },

  async deleteUser(id: string): Promise<void> {
    // Al borrar el perfil, no se borra de Auth, pero por ahora como no tenemos backend
    // borraremos el perfil local para ocultarlo (o desactivarlo)
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
  }
};
