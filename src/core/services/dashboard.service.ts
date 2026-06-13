import { supabase } from './supabase';
import type { ClassEntity } from '../types/classes.types';

export interface DashboardStats {
  totalStudents: number;
  activeClasses: number;
}

export interface FinancialBalance {
  monthlyTotal: number;
  annualTotal: number;
  monthlyByPlan: Record<string, number>;
  annualByPlan: Record<string, number>;
}

export const dashboardService = {
  /**
   * Obtiene estadísticas generales
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const [studentsCount, classesCount] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('classes').select('id', { count: 'exact', head: true }).eq('is_active', true)
    ]);

    if (studentsCount.error) throw studentsCount.error;
    if (classesCount.error) throw classesCount.error;

    return {
      totalStudents: studentsCount.count || 0,
      activeClasses: classesCount.count || 0
    };
  },

  /**
   * Obtiene el balance financiero usando la función RPC de Supabase
   */
  async getFinancialBalance(): Promise<FinancialBalance> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12 para SQL

    const { data, error } = await supabase.rpc('get_financial_balance', {
      query_year: currentYear,
      query_month: currentMonth
    });

    if (error) throw error;
    
    // Convertimos explícitamente a Number por si Postgres devuelve los agregados como Strings (muy común con NUMERIC/SUM)
    const rawData = data as any;
    
    return {
      monthlyTotal: Number(rawData.monthlyTotal || 0),
      annualTotal: Number(rawData.annualTotal || 0),
      monthlyByPlan: Object.fromEntries(Object.entries(rawData.monthlyByPlan || {}).map(([k, v]) => [k, Number(v)])),
      annualByPlan: Object.fromEntries(Object.entries(rawData.annualByPlan || {}).map(([k, v]) => [k, Number(v)]))
    };
  },

  /**
   * Obtiene las clases del día actual
   */
  async getTodayClasses(): Promise<ClassEntity[]> {
    const today = new Date().getDay(); // 0 (Domingo) a 6 (Sábado)

    const { data, error } = await supabase
      .from('classes')
      .select('*, profiles:teacher_id(full_name)')
      .eq('day_of_week', today)
      .eq('is_active', true)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data as ClassEntity[];
  },

  /**
   * Obtiene la información del dashboard del alumno
   */
  async getStudentDashboardData(studentId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    const [paymentsRes, enrollmentsRes] = await Promise.all([
      supabase
        .from('payments')
        .select('plan_id, plan_details, expiration_date')
        .eq('student_id', studentId)
        .gte('expiration_date', today)
        .order('expiration_date', { ascending: false })
        .limit(1),
      supabase
        .from('enrollments')
        .select('reservation_date, classes(activity_name, start_time, end_time)')
        .eq('student_id', studentId)
        .gte('reservation_date', today)
        .order('reservation_date', { ascending: true })
        .limit(1)
    ]);

    if (paymentsRes.error) throw paymentsRes.error;
    if (enrollmentsRes.error) throw enrollmentsRes.error;

    return {
      activePlan: paymentsRes.data?.[0] || null,
      nextClass: enrollmentsRes.data?.[0] || null
    };
  }
};
