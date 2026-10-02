import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { useAuthStore } from '../store/useAuthStore';
import type { UserProfile } from '../types/users.types';
import type { Specialty } from '../types/users.types';
import type { StudentOnboardingPayload, TeacherOnboardingPayload } from '../types/users.types';

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
  async getStudents(studioId: string): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, plans(*), studio_members!inner(*)')
      .eq('studio_members.studio_id', studioId)
      .eq('studio_members.role', 'student')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as UserProfile[];
  },

  async getTeachers(studioId: string): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, classes(activity_name, teacher_commission_pct), studio_members!inner(*)')
      .eq('studio_members.studio_id', studioId)
      .eq('studio_members.role', 'teacher')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as UserProfile[];
  },

  async addSelfAsTeacher(studioId: string): Promise<void> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session?.user) throw new Error('No hay sesión activa');

    const userId = session.user.id;

    const { data: existing } = await supabase
      .from('studio_members')
      .select('*')
      .eq('studio_id', studioId)
      .eq('user_id', userId)
      .eq('role', 'teacher')
      .maybeSingle();

    if (existing) throw new Error('Ya sos profesor de este estudio');

    const { error } = await supabase.from('studio_members').insert([
      { studio_id: studioId, user_id: userId, role: 'teacher' },
    ]);

    if (error) throw error;

    // Mark onboarding as completed — the admin profile already exists,
    // no need to go through teacher onboarding when switching roles.
    await supabase
      .from('profiles')
      .update({ has_completed_onboarding: true })
      .eq('id', userId);
  },

  async createUser(payload: {
    email: string;
    full_name: string;
    phone?: string;
    role: 'student' | 'teacher';
    password: string;
    studio_id: string;
  }): Promise<void> {
    // 1. Crear en Auth (esto dispara el trigger handle_new_user en la DB)
    const { data, error } = await authClient.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.full_name,
          phone: payload.phone,
          role: payload.role,
          studio_id: payload.studio_id
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

  async assignStudentPlan(
    studentId: string,
    planId: string,
  ): Promise<{ planChangeAudited: boolean }> {
    const currentUser = useAuthStore.getState().user;

    // Same month-end convention the app already used to assign a plan from the
    // student form: the last day of the current month.
    const planExpirationDate = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
    )
      .toISOString()
      .split('T')[0];

    // Read the current plan first so the audit row records the old plan. A failed
    // read must not block the assignment (the primary outcome): it only disables
    // the audit row, mirroring recordPayment's honesty pattern.
    let oldPlanId: string | null = null;
    let planChangeAuditable = true;

    try {
      const { data: profileData, error: profileReadError } = await supabase
        .from('profiles')
        .select('plan_id')
        .eq('id', studentId)
        .single();

      if (profileReadError) throw profileReadError;

      oldPlanId = profileData?.plan_id ?? null;
    } catch (readError) {
      planChangeAuditable = false;
      console.error(readError instanceof Error ? readError : new Error(String(readError)));
    }

    // The assignment is the primary outcome: it must persist even if the audit fails.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ plan_id: planId, plan_expiration_date: planExpirationDate })
      .eq('id', studentId);

    if (profileError) throw profileError;

    if (!planChangeAuditable) {
      return { planChangeAudited: false };
    }

    try {
      const { error: planChangeError } = await supabase.from('plan_changes').insert({
        profile_id: studentId,
        old_plan_id: oldPlanId,
        new_plan_id: planId,
        changed_by: currentUser?.id ?? studentId,
        payment_id: null,
      });

      if (planChangeError) throw planChangeError;

      return { planChangeAudited: true };
    } catch (planChangeError) {
      // The assignment is already committed; log for manual reconciliation instead
      // of throwing, so the caller reports the audit as failed, not the assignment.
      console.error(
        planChangeError instanceof Error ? planChangeError : new Error(String(planChangeError)),
      );
      return { planChangeAudited: false };
    }
  },

  async updatePassword(newPassword: string): Promise<void> {
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) throw authError;
  },

  async saveOnboardingDetails(profileId: string, details: StudentOnboardingPayload): Promise<void> {
    const studioId = useAuthStore.getState().current_studio_id;

    // 1. Insert Student Details
    const { error: detailsError } = await supabase
      .from('student_details')
      .insert([{ profile_id: profileId, studio_id: studioId, ...details }]);

    if (detailsError) throw detailsError;

    // 2. Mark Onboarding as Completed in Profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ has_completed_onboarding: true })
      .eq('id', profileId);

    if (profileError) throw profileError;
  },

  async saveTeacherOnboardingDetails(profileId: string, details: TeacherOnboardingPayload): Promise<void> {
    const studioId = useAuthStore.getState().current_studio_id;

    const { error: detailsError } = await supabase
      .from('teacher_details')
      .insert([{ profile_id: profileId, studio_id: studioId, ...details }]);

    if (detailsError) throw detailsError;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ has_completed_onboarding: true })
      .eq('id', profileId);

    if (profileError) throw profileError;
  },

  async getSpecialties(): Promise<Specialty[]> {
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
