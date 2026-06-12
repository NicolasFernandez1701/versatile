export interface Profile {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface ClassEntity {
  id: string;
  activity_name: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  capacity: number;
  base_price: number;
  teacher_commission_pct: number;
  // Campos cruzados (Joins)
  profiles?: { full_name: string };
  enrollments?: { count: number }[];
}

export interface EnrollmentEntity {
  id: string;
  class_id: string;
  student_id: string;
  profiles?: Profile;
}
