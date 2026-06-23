import { supabase } from './supabase';
import type { ClassEntity, EnrollmentEntity, Profile } from '../types/classes.types';

export const classesService = {
  async getClasses(): Promise<ClassEntity[]> {
    const { data, error } = await supabase
      .from('classes')
      .select('*, profiles(full_name), enrollments(count)')
      .order('day_of_week', { ascending: true });

    if (error) throw error;
    return data as any; // Typecasting for complex joins
  },

  async getClassesByTeacher(teacherId: string): Promise<ClassEntity[]> {
    const { data, error } = await supabase
      .from('classes')
      .select('*, profiles(full_name), enrollments(count)')
      .eq('teacher_id', teacherId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data as any;
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
    return data as any;
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
    if (payload.activity_name) {
      await supabase
        .from('specialties')
        .upsert({ name: payload.activity_name }, { onConflict: 'name' });
    }
    const { error } = await supabase.from('classes').insert(payload);
    if (error) throw error;
  },

  async getClassById(id: string): Promise<ClassEntity> {
    const { data, error } = await supabase.from('classes').select('*').eq('id', id).single();

    if (error) throw error;
    return data as ClassEntity;
  },

  async updateClass(id: string, payload: Partial<ClassEntity>): Promise<void> {
    if (payload.activity_name) {
      await supabase
        .from('specialties')
        .upsert({ name: payload.activity_name }, { onConflict: 'name' });
    }
    const { error } = await supabase.from('classes').update(payload).eq('id', id);

    if (error) throw error;
  }
};
