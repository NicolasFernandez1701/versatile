export interface EnrollmentEntity {
  id: string;
  student_id: string;
  class_id: string;
  reservation_date: string;
  attendance_status: 'pending' | 'attended' | 'absent' | 'cancelled';
  created_at: string;
  plan_id?: string;
  activity_id?: string;

  // Joins
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  };
  classes?: {
    activity_name: string;
    day_of_week: number;
    start_time: string;
  };
}
