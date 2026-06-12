export interface EnrollmentEntity {
  id: string;
  student_id: string;
  class_id: string;
  created_at: string;
  
  // Joins
  profiles?: {
    full_name: string;
    email: string;
  };
  classes?: {
    activity_name: string;
    day_of_week: number;
    start_time: string;
  };
}
