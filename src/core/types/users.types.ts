export interface UserProfile {
  id: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'student';
  email: string;
  phone?: string;

  // Student Specific
  plan_id?: string;
  plan_expiration_date?: string;
  promotion_discount_pct?: number;
  promotion_expiration_date?: string;
  has_completed_onboarding?: boolean;

  // Joins
  plans?: {
    id: string;
    name: string;
    price: number;
    classes_per_week: number;
  };
  student_details?: StudentDetails;
  classes?: {
    activity_name: string;
    teacher_commission_pct: number;
  }[];

  created_at: string;
}

export interface StudentDetails {
  profile_id: string;

  // Paso 1
  document_id?: string;
  birth_date?: string;
  age?: number;
  address?: string;
  occupation?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;

  // Paso 2
  chronic_diseases?: string;
  allergies?: string;
  recent_injuries?: string;
  medications?: string;
  medical_certificate_url?: string;
  medical_certificate_status?: 'pending' | 'approved' | 'rejected' | 'expired';
  medical_certificate_expiration?: string;

  // Paso 3
  currently_active?: boolean;
  training_experience?: string;
  daily_work_activity?: string;

  // Paso 4
  main_objectives?: string[];
  preferred_schedule?: string;

  // Paso 5
  agreed_to_data_protection?: boolean;
  agreed_to_medical_exoneration?: boolean;
  agreed_to_facility_rules?: boolean;
  agreed_to_image_rights?: boolean;

  created_at?: string;
  updated_at?: string;
}
