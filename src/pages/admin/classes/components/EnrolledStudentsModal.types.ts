import type { EnrollmentEntity } from '@/core/types/classes.types';

export interface EnrolledStudentsModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  students: EnrollmentEntity[];
  isLoading: boolean;
  onStudentRemoved?: () => void;
}
