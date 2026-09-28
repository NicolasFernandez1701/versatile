export interface AttendanceByStudent {
  student_id: string;
  full_name: string;
  attended: number;
  absent: number;
  cancelled: number;
  total: number;
}

export interface AttendanceByClass {
  class_id: string;
  activity_name: string;
  day_of_week: number;
  total_enrolled: number;
  attended: number;
  absent: number;
  attendance_rate: number;
}

export interface RevenueByMonth {
  month: string;
  total: number;
}

export interface PopularClass {
  activity_name: string;
  enrollment_count: number;
}

export interface TeacherCommission {
  teacher_id: string;
  full_name: string;
  total_earned: number;
  class_count: number;
}

export interface RetentionMetric {
  student_id: string;
  full_name: string;
  last_attendance: string;
  days_since_last: number;
}
