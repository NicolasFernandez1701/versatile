import { supabase } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import type { ClassEntity, EnrollmentEntity, Profile } from '../types/classes.types';

/**
 * Ensures the class activity exists in the studio specialty catalog.
 * The result used to be ignored: a failed upsert left the class created while the
 * activity never appeared in the specialty list, with no signal to anyone.
 */
async function upsertActivitySpecialty(activityName: string, studioId: string): Promise<void> {
  const { error } = await supabase
    .from('specialties')
    .upsert({ name: activityName, studio_id: studioId }, { onConflict: 'name,studio_id' });

  if (error) throw error;
}


export const classesService = {
  async getClasses(studioId: string): Promise<ClassEntity[]> {
    const { data, error } = await supabase
      .from('classes')
      .select('*, profiles(full_name), enrollments(count)')
      .eq('studio_id', studioId)
      .order('day_of_week', { ascending: true });

    if (error) throw error;
    return data as ClassEntity[];
  },

  async getClassesByTeacher(teacherId: string): Promise<ClassEntity[]> {
    const { data, error } = await supabase
      .from('classes')
      .select('*, profiles(full_name), enrollments(count)')
      .eq('teacher_id', teacherId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data as ClassEntity[];
  },

  async deactivateClass(id: string): Promise<void> {
    // Classes are deactivated, never deleted: enrollments.class_id and
    // commissions.class_id both cascade on delete, so removing a class would
    // destroy the attendance history and the teacher commission records with it.
    const { data, error } = await supabase
      .from('classes')
      .update({ is_active: false })
      .eq('id', id)
      .select('id');

    if (error) throw error;

    // RLS blocks are silent; never report success when nothing was updated.
    if (!data || data.length === 0) {
      throw new Error('No se desactivó ninguna clase (permisos insuficientes o la clase ya no existe)');
    }
  },

  async getEnrolledStudents(
    classId: string,
    reservationDate?: string
  ): Promise<EnrollmentEntity[]> {
    let query = supabase
      .from('enrollments')
      .select('id, reservation_date, attendance_status, profiles(id, full_name, email, phone)')
      .eq('class_id', classId);

    if (reservationDate) {
      query = query.eq('reservation_date', reservationDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as unknown as EnrollmentEntity[];
  },

  async cancelEnrollment(enrollmentId: string): Promise<void> {
    const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
    if (error) throw error;
  },

  async getTeachers(): Promise<Profile[]> {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'teacher');

    if (error) throw error;
    return data as Profile[];
  },

  async createClass(payload: Partial<ClassEntity>): Promise<void> {
    const studioId = useAuthStore.getState().current_studio_id;
    if (!studioId) throw new Error('No active studio');

    if (payload.activity_name) {
      await upsertActivitySpecialty(payload.activity_name, studioId);
    }

    const { error } = await supabase.from('classes').insert({ ...payload, studio_id: studioId });
    if (error) throw error;
  },

  async createClasses(payload: Partial<ClassEntity>, days: number[]): Promise<void> {
    const studioId = useAuthStore.getState().current_studio_id;
    if (!studioId) throw new Error('No active studio');

    if (payload.activity_name) {
      await upsertActivitySpecialty(payload.activity_name, studioId);
    }

    const records = days.map((day) => ({
      ...payload,
      day_of_week: day,
      studio_id: studioId,
    }));

    const { error } = await supabase.from('classes').insert(records);
    if (error) throw error;
  },

  async getClassById(id: string): Promise<ClassEntity> {
    const { data, error } = await supabase.from('classes').select('*').eq('id', id).single();

    if (error) throw error;
    return data as ClassEntity;
  },

  async updateClass(id: string, payload: Partial<ClassEntity>): Promise<void> {
    const studioId = useAuthStore.getState().current_studio_id;
    if (!studioId) throw new Error('No active studio');

    if (payload.activity_name) {
      await upsertActivitySpecialty(payload.activity_name, studioId);
    }

    const { error } = await supabase.from('classes').update(payload).eq('id', id);

    if (error) throw error;
  }
};
