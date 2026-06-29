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
