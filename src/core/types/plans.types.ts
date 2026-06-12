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
