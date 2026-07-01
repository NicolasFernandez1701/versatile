import type { QuotaMap } from './plans.types';

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

export interface StudentActivePlan {
  plan_id: string;
  plan_details: string;
  expiration_date: string;
}

export interface StudentNextClass {
  reservation_date: string;
  classes: {
    activity_name: string;
    start_time: string;
    end_time: string;
  } | null;
}

export interface StudentDashboardData {
  activePlan: StudentActivePlan | null;
  nextClass: StudentNextClass | null;
}

export interface StudentClassLimit {
  limit: number;
  classesPerWeek: number;
  perActivity: QuotaMap;
}
