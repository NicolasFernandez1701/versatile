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

  async enrollStudent(studentId: string, classId: string, reservationDate: string): Promise<void> {
    // 1. Validar límite mensual del alumno
    // Obtenemos el perfil y su plan para saber cuántas clases tiene por semana
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan_id, plans(classes_per_week)')
      .eq('id', studentId)
      .single();

    if (profileError) throw profileError;
    if (!profile?.plan_id) throw new Error('El alumno no tiene un plan activo asignado.');
    
    // Obtenemos cuántas reservas tiene el alumno en el MES actual
    const [year, month] = reservationDate.split('-');
    const firstDayOfMonth = `${year}-${month}-01`;
    const lastDayOfMonth = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

    const { count: monthlyCount, error: countMonthlyError } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .gte('reservation_date', firstDayOfMonth)
      .lte('reservation_date', lastDayOfMonth)
      .neq('attendance_status', 'cancelled'); // No contamos las canceladas

    if (countMonthlyError) throw countMonthlyError;

    // TODO: La base de datos guarda 'classes_per_week', en muchos gimnasios el cupo mensual es x4
    const classesPerMonth = (profile.plans as any)?.classes_per_week * 4 || 0;
    
    if (monthlyCount !== null && monthlyCount >= classesPerMonth) {
      throw new Error(`Límite mensual excedido. El plan permite ${classesPerMonth} clases por mes.`);
    }

    // 2. Chequear cupo disponible de la clase
    const { count: enrolledCount, error: countError } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('reservation_date', reservationDate)
      .neq('attendance_status', 'cancelled');

    if (countError) throw countError;

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('capacity')
      .eq('id', classId)
      .single();

    if (classError) throw classError;

    if (enrolledCount !== null && classData && enrolledCount >= classData.capacity) {
      throw new Error('La clase ha alcanzado su capacidad máxima para esa fecha.');
    }

    // 3. Inscribir (Reservar)
    const { error } = await supabase
      .from('enrollments')
      .insert({ student_id: studentId, class_id: classId, reservation_date: reservationDate });

    if (error) {
      if (error.code === '23505') throw new Error('El alumno ya está inscripto en esta clase para ese día.');
      throw error;
    }
  },

  async unenrollStudent(id: string): Promise<void> {
    const { error } = await supabase.from('enrollments').delete().eq('id', id);
    if (error) throw error;
  }
};
