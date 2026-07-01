import { supabase } from './supabase';
import type { EnrollmentEntity } from '../types/enrollments.types';
import type { AttendanceRecord } from '../types/attendance.types';

export type { AttendanceRecord } from '../types/attendance.types';

interface EnrollmentRow {
  id: string;
  student_id: string;
  class_id: string;
  reservation_date: string;
  attendance_status: 'pending' | 'attended' | 'absent' | 'cancelled';
  profiles?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  }[];
}

function mapAttendanceStatus(
  raw: 'pending' | 'attended' | 'absent' | 'cancelled'
): AttendanceRecord['status'] {
  if (raw === 'attended') return 'present';
  return raw;
}

export const attendanceService = {
  /**
   * Obtiene la lista de todos los inscriptos a una clase, sin importar la fecha.
   */
  async getClassEnrollments(classId: string): Promise<EnrollmentEntity[]> {
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

    return ((data || []) as unknown as EnrollmentRow[]).map((enr) => ({
      id: enr.id,
      student_id: enr.student_id,
      class_id: enr.class_id,
      reservation_date: enr.reservation_date,
      attendance_status: enr.attendance_status,
      created_at: '',
      profiles: enr.profiles?.[0]
        ? {
            full_name: enr.profiles[0].full_name,
            email: enr.profiles[0].email,
            phone: enr.profiles[0].phone
          }
        : undefined
    }));
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
    return ((data || []) as unknown as EnrollmentRow[]).map((enr: EnrollmentRow) => ({
      id: enr.id,
      enrollment_id: enr.id,
      date: enr.reservation_date,
      status: mapAttendanceStatus(enr.attendance_status),
      enrollments: {
        student_id: enr.student_id,
        class_id: enr.class_id,
        profiles: enr.profiles?.[0]
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

    return ((data || []) as unknown as EnrollmentRow[]).map((enr: EnrollmentRow) => ({
      id: enr.id,
      enrollment_id: enr.id,
      date: enr.reservation_date,
      status: mapAttendanceStatus(enr.attendance_status),
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
