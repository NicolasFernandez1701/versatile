import type { Profile } from './classes.types';

export interface PaymentEntity {
  id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  expiration_date: string;
  plan_details: string;
  payment_method: 'efectivo' | 'transferencia';
  original_amount: number;
  discount_applied: number;
  surcharge_applied: number;
  late_payment: boolean;
  late_fee_applied: boolean;
  is_first_payment: boolean;
  created_at: string;

  // Joins
  profiles?: Profile;
}

export interface PlanChangePayload {
  newPlanId: string;
  studentId: string;
}

export interface RecordPaymentPayload {
  student_id: string;
  plan_id?: string;
  amount: number;
  expiration_date: string;
  plan_details: string;
  payment_method: 'efectivo' | 'transferencia';
  original_amount: number;
  discount_applied: number;
  surcharge_applied: number;
  late_payment: boolean;
  late_fee_applied: boolean;
  is_first_payment: boolean;
  planChange?: PlanChangePayload;
}

export interface StudentWithPlan {
  id: string;
  full_name: string;
  email: string;
  plan_id: string | null;
  promotion_expiration_date: string | null;
  promotion_discount_pct: number | null;
  plans: {
    id: string;
    name: string;
    price: number;
    classes_per_week: number;
  } | null;
}
