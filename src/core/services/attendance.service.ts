import { supabase } from './supabase';

export interface AttendanceRecord {
  id: string; // Will map to enrollment id
  enrollment_id: string; // Will also map to enrollment id for backwards compatibility
  date: string;
  status: 'present' | 'absent' | 'confirmed' | 'cancelled' | 'pending';
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
      .select(
        `
        id,
        student_id,
        class_id,
        reservation_date,
        attendance_status,
        profiles (
          id,
          full_name,
          phone,
          email
        )
      `
      )
      .eq('class_id', classId);

    if (error) throw error;
    return data;
  },

  /**
   * Obtiene la asistencia de una clase en una fecha específica.
   */
  async getClassAttendanceByDate(classId: string, date: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select(
        `
        id,
        student_id,
        class_id,
        reservation_date,
        attendance_status,
        profiles (
          id,
          full_name,
          phone,
          email
        )
      `
      )
      .eq('class_id', classId)
      .eq('reservation_date', date)
      .neq('attendance_status', 'cancelled'); // No mostramos a los que cancelaron

    if (error) throw error;

    // Mapear al formato esperado por el frontend
    return (data || []).map((enr: any) => ({
      id: enr.id,
      enrollment_id: enr.id,
      date: enr.reservation_date,
      status: enr.attendance_status,
      enrollments: {
        student_id: enr.student_id,
        class_id: enr.class_id,
        profiles: enr.profiles
      }
    }));
  },

  /**
   * Marca la asistencia de un alumno (crea o actualiza el registro).
   */
  async markAttendance(
    enrollmentId: string,
    _date: string,
    status: 'present' | 'absent' | 'confirmed' | 'pending'
  ): Promise<void> {
    const mappedStatus = status === 'present' ? 'attended' : status;
    const { error } = await supabase
      .from('enrollments')
      .update({ attendance_status: mappedStatus })
      .eq('id', enrollmentId);

    if (error) throw error;
  },

  /**
   * Obtiene las asistencias de un alumno a partir de sus enrollments.
   */
  async getStudentAttendances(studentId: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select(
        `
        id,
        student_id,
        class_id,
        reservation_date,
        attendance_status
      `
      )
      .eq('student_id', studentId);

    if (error) throw error;

    return (data || []).map((enr: any) => ({
      id: enr.id,
      enrollment_id: enr.id,
      date: enr.reservation_date,
      status: enr.attendance_status,
      enrollments: {
        student_id: enr.student_id,
        class_id: enr.class_id
      }
    }));
  },

  /**
   * Permite al alumno confirmar o cancelar su asistencia (booking).
   */
  async toggleStudentBooking(
    enrollmentId: string,
    _date: string,
    newStatus: 'confirmed' | 'cancelled'
  ): Promise<void> {
    const mappedStatus = newStatus === 'confirmed' ? 'pending' : 'cancelled';
    const { error } = await supabase
      .from('enrollments')
      .update({ attendance_status: mappedStatus })
      .eq('id', enrollmentId);

    if (error) throw error;
  }
};
