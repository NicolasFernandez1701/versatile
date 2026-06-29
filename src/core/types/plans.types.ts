export interface PlanActivityEntity {
  id: string;
  plan_id: string;
  activity_name: string;
  classes_per_week: number;
  created_at: string;
}

export interface PlanEntity {
  id: string;
  name: string;
  price: number;
  classes_per_week: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plan_activities?: PlanActivityEntity[];
}

export type PlanWithActivities = PlanEntity & {
  plan_activities: PlanActivityEntity[];
};

export interface PlanChange {
  id: string;
  profile_id: string;
  old_plan_id: string | null;
  new_plan_id: string;
  changed_at: string;
  changed_by: string;
  payment_id: string | null;
}

export interface ActivityQuota {
  activity_id: string;
  activity_name: string;
  total: number;
  consumed: number;
  remaining: number;
}

export type QuotaMap = Record<string, ActivityQuota>;

export interface CreatePlanDTO {
  name: string;
  price: number;
  classes_per_week: number;
  is_active?: boolean;
}

export interface CreatePlanActivityDTO {
  activity_name: string;
  classes_per_week: number;
}
