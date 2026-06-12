import { supabase } from './supabase';
import type { EnrollmentEntity } from '../types/enrollments.types';

export const enrollmentsService = {
  async getEnrollments(): Promise<EnrollmentEntity[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, profiles(full_name, email), classes(activity_name, day_of_week, start_time)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as any;
  },

  async enrollStudent(studentId: string, classId: string): Promise<void> {
    // 1. Chequear cupo disponible
    const { count: enrolledCount, error: countError } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId);

    if (countError) throw countError;

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('capacity')
      .eq('id', classId)
      .single();

    if (classError) throw classError;

    if (enrolledCount !== null && classData && enrolledCount >= classData.capacity) {
      throw new Error('La clase ha alcanzado su capacidad máxima.');
    }

    // 2. Inscribir
    const { error } = await supabase
      .from('enrollments')
      .insert({ student_id: studentId, class_id: classId });

    if (error) {
      if (error.code === '23505') throw new Error('El alumno ya está inscripto en esta clase.');
      throw error;
    }
  },

  async unenrollStudent(id: string): Promise<void> {
    const { error } = await supabase.from('enrollments').delete().eq('id', id);
    if (error) throw error;
  }
};
