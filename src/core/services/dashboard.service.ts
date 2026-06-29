import { supabase } from './supabase';
import type { ClassEntity } from '../types/classes.types';
import type { StudentDashboardData, StudentActivePlan, StudentClassLimit } from '../types/dashboard.types';

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

interface RpcFinancialBalanceRow {
  monthlyTotal: number | string | null;
  annualTotal: number | string | null;
  monthlyByPlan: Record<string, number | string> | null;
  annualByPlan: Record<string, number | string> | null;
}

export const dashboardService = {
  /**
   * Obtiene estadísticas generales del studio
   */
  async getDashboardStats(studioId: string): Promise<DashboardStats> {
    const [studentsCount, classesCount] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'student')
        .eq('studio_id', studioId),
      supabase
        .from('classes')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('studio_id', studioId)
    ]);

    if (studentsCount.error) throw studentsCount.error;
    if (classesCount.error) throw classesCount.error;

    return {
      totalStudents: studentsCount.count || 0,
      activeClasses: classesCount.count || 0
    };
  },

  /**
   * Obtiene el balance financiero del studio usando la función RPC de Supabase
   */
  async getFinancialBalance(studioId: string): Promise<FinancialBalance> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12 para SQL

    const { data, error } = await supabase.rpc('get_financial_balance', {
      query_year: currentYear,
      query_month: currentMonth,
      p_studio_id: studioId
    });

    if (error) throw error;

    // Convertimos explícitamente a Number por si Postgres devuelve los agregados como Strings (muy común con NUMERIC/SUM)
    const rawData = data as RpcFinancialBalanceRow;

    return {
      monthlyTotal: Number(rawData.monthlyTotal || 0),
      annualTotal: Number(rawData.annualTotal || 0),
      monthlyByPlan: Object.fromEntries(
        Object.entries(rawData.monthlyByPlan || {}).map(([k, v]) => [k, Number(v)])
      ),
      annualByPlan: Object.fromEntries(
        Object.entries(rawData.annualByPlan || {}).map(([k, v]) => [k, Number(v)])
      )
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
  async getStudentDashboardData(studentId: string): Promise<StudentDashboardData> {
    const today = new Date().toISOString().split('T')[0];

    const [paymentsRes, enrollmentsRes, profileRes] = await Promise.all([
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
        .limit(1),
      supabase
        .from('profiles')
        .select('plan_id, plan_expiration_date, plans(name)')
        .eq('id', studentId)
        .single()
    ]);

    if (paymentsRes.error) throw paymentsRes.error;
    if (enrollmentsRes.error) throw enrollmentsRes.error;

    // Prefer payment plan; fallback to profile-assigned plan
    let activePlan: StudentActivePlan | null =
      (paymentsRes.data?.[0] as StudentActivePlan | undefined) || null;

    if (
      !activePlan &&
      profileRes.data?.plan_id &&
      profileRes.data.plan_expiration_date &&
      profileRes.data.plan_expiration_date >= today
    ) {
      const profilePlan = (
        profileRes.data as unknown as { plans: { name: string } | null }
      ).plans;
      activePlan = {
        plan_id: profileRes.data.plan_id,
        plan_details: profilePlan?.name || 'Plan Asignado',
        expiration_date: profileRes.data.plan_expiration_date
      };
    }

    const rawNextClass = enrollmentsRes.data?.[0] as unknown as
      | { reservation_date: string; classes: { activity_name: string; start_time: string; end_time: string } }
      | undefined;

    return {
      activePlan,
      nextClass: rawNextClass || null
    };
  },

  /**
   * Obtiene el límite mensual de clases del alumno.
   * Prioriza el plan del pago activo; si no hay, usa el plan del perfil.
   */
  async getStudentClassLimit(studentId: string): Promise<StudentClassLimit> {
    const today = new Date().toISOString().split('T')[0];

    // 1. Buscar pago activo
    const { data: payments } = await supabase
      .from('payments')
      .select('plan_id, plans(classes_per_week)')
      .eq('student_id', studentId)
      .gte('expiration_date', today)
      .order('expiration_date', { ascending: false })
      .limit(1);

    const activePayment = payments?.[0] as
      | { plans: { classes_per_week: number } | null }
      | undefined;

    let classesPerWeek = activePayment?.plans?.classes_per_week;

    // 2. Fallback al plan del perfil
    if (!classesPerWeek) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_id, plans(classes_per_week)')
        .eq('id', studentId)
        .single();

      const profilePlan = (profile as { plans: { classes_per_week: number } | null } | null)?.plans;
      classesPerWeek = profilePlan?.classes_per_week || 0;
    }

    return {
      limit: (classesPerWeek || 0) * 4,
      classesPerWeek: classesPerWeek || 0,
      perActivity: {},
    };
  }
};
