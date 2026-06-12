import { supabase } from './supabase';

export interface AttendanceRecord {
  id: string;
  enrollment_id: string;
  date: string;
  status: 'present' | 'absent' | 'confirmed' | 'cancelled';
  enrollments?: {
    student_id: string;
    class_id: string;
    profiles?: {
      id: string;
      full_name: string;
      email: string;
      phone: string;
    };
  };
}

export const attendanceService = {
  /**
   * Obtiene la lista de todos los inscriptos a una clase, sin importar la fecha.
   */
  async getClassEnrollments(classId: string) {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        class_id,
        profiles (
          id,
          full_name,
          phone,
          email
        )
      `)
      .eq('class_id', classId);

    if (error) throw error;
    return data;
  },

  /**
   * Obtiene la asistencia de una clase en una fecha específica.
   * Trae los registros de la tabla 'attendance' que tengan status 'confirmed', 'present' o 'absent'.
   */
  async getClassAttendanceByDate(classId: string, date: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        id,
        enrollment_id,
        date,
        status,
        enrollments!inner (
          class_id,
          student_id,
          profiles (
            id,
            full_name,
            phone,
            email
          )
        )
      `)
      .eq('enrollments.class_id', classId)
      .eq('date', date)
      .neq('status', 'cancelled'); // No mostramos a los que cancelaron

    if (error) throw error;
    return data as any;
  },

  /**
   * Marca la asistencia de un alumno (crea o actualiza el registro).
   */
  async markAttendance(enrollmentId: string, date: string, status: 'present' | 'absent' | 'confirmed'): Promise<void> {
    const { error } = await supabase
      .from('attendance')
      .upsert({
        enrollment_id: enrollmentId,
        date,
        status
      }, { onConflict: 'enrollment_id,date' });
    if (error) throw error;
  },
  /**
   * Obtiene las asistencias de un alumno a partir de sus enrollments.
   */
  async getStudentAttendances(studentId: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        id,
        enrollment_id,
        date,
        status,
        enrollments!inner (
          student_id,
          class_id
        )
      `)
      .eq('enrollments.student_id', studentId);

    if (error) throw error;
    return data as any;
  },

  /**
   * Permite al alumno confirmar o cancelar su asistencia (booking).
   */
  async toggleStudentBooking(enrollmentId: string, date: string, newStatus: 'confirmed' | 'cancelled'): Promise<void> {
    const { error } = await supabase
      .from('attendance')
      .upsert({
        enrollment_id: enrollmentId,
        date,
        status: newStatus
      }, { onConflict: 'enrollment_id,date' });

    if (error) throw error;
  }
};
