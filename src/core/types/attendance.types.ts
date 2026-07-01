export interface AttendanceRecord {
  id: string; // Will map to enrollment id
  enrollment_id: string; // Will also map to enrollment id for backwards compatibility
  date: string;
  status: 'present' | 'absent' | 'confirmed' | 'cancelled' | 'pending';
  enrollments?: {
    student_id: string;
    class_id: string;
    profiles?: {
      id: string;
      full_name: string;
      email: string;
      phone: string;
    };
  };
}
