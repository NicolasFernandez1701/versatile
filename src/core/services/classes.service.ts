import { supabase } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import type { ClassEntity, EnrollmentEntity, Profile } from '../types/classes.types';

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

  async deleteClass(id: string): Promise<void> {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) throw error;
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
      await supabase
        .from('specialties')
        .upsert({ name: payload.activity_name, studio_id: studioId }, { onConflict: 'name,studio_id' });
    }
    const { error } = await supabase.from('classes').insert({ ...payload, studio_id: studioId });
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
      await supabase
        .from('specialties')
        .upsert({ name: payload.activity_name, studio_id: studioId }, { onConflict: 'name,studio_id' });
    }
    const { error } = await supabase.from('classes').update(payload).eq('id', id);

    if (error) throw error;
  }
};
