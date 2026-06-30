import { supabase } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import { plansService } from './plans.service';
import { getRemainingQuota } from '../utils/quotaTracker';
import type { EnrollmentEntity } from '../types/enrollments.types';

export const enrollmentsService = {
  async getEnrollments(): Promise<EnrollmentEntity[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, profiles(full_name, email), classes(activity_name, day_of_week, start_time)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as EnrollmentEntity[];
  },

  async enrollStudent(studentId: string, classId: string, reservationDate: string): Promise<void> {
    // 0. Validar período de gracia: días 1-10 permiten inscripción sin pago del mes actual
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const paymentFirstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const paymentLastDay = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

    const { count: currentMonthPaymentCount, error: paymentError } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .gte('payment_date', paymentFirstDay)
      .lte('payment_date', paymentLastDay);

    if (paymentError) throw paymentError;

    if ((currentMonthPaymentCount ?? 0) === 0 && today.getDate() > 10) {
      throw new Error('El alumno debe abonar la cuota del mes actual antes de inscribirse.');
    }

    // 1. Validar límite por actividad del alumno
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan_id')
      .eq('id', studentId)
      .single();

    if (profileError) throw profileError;
    if (!profile?.plan_id) throw new Error('El alumno no tiene un plan activo asignado.');

    const plan = await plansService.getPlanById(profile.plan_id);

    const [year, month] = reservationDate.split('-');
    const monthStart = new Date(Number(year), Number(month) - 1, 1);
    const monthEnd = new Date(Number(year), Number(month), 0);

    const remainingQuota = await getRemainingQuota(studentId, profile.plan_id, plan, monthStart, monthEnd);

    // 2. Chequear cupo disponible de la clase y obtener su actividad
    const { count: enrolledCount, error: countError } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('reservation_date', reservationDate)
      .neq('attendance_status', 'cancelled');

    if (countError) throw countError;

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('capacity, activity_name')
      .eq('id', classId)
      .single();

    if (classError) throw classError;

    if (enrolledCount !== null && classData && enrolledCount >= classData.capacity) {
      throw new Error('La clase ha alcanzado su capacidad máxima para esa fecha.');
    }

    const activityQuota = classData?.activity_name ? remainingQuota[classData.activity_name] : undefined;
    if (!activityQuota || activityQuota.remaining <= 0) {
      throw new Error(`Límite de cupos de ${classData?.activity_name ?? 'esta actividad'} excedido.`);
    }

    // 3. Inscribir (Reservar)
    const studioId = useAuthStore.getState().current_studio_id;
    if (!studioId) throw new Error('No active studio');

    const { error } = await supabase
      .from('enrollments')
      .insert({
        student_id: studentId,
        class_id: classId,
        reservation_date: reservationDate,
        studio_id: studioId,
        plan_id: profile.plan_id,
      });

    if (error) {
      if (error.code === '23505')
        throw new Error('El alumno ya está inscripto en esta clase para ese día.');
      throw error;
    }
  },

  async unenrollStudent(id: string): Promise<void> {
    const { error } = await supabase.from('enrollments').delete().eq('id', id);
    if (error) throw error;
  }
};
