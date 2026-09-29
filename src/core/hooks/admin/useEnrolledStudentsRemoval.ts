import { useState } from 'react';
import { classesService } from '@/core/services';
import { useAlert } from '@/ui/useAlert';

export interface UseEnrolledStudentsRemovalResult {
  removingId: string | null;
  studentToCancel: string | null;
  requestRemove: (enrollmentId: string) => void;
  cancelRemove: () => void;
  confirmRemove: () => Promise<void>;
}

export function useEnrolledStudentsRemoval(
  onStudentRemoved?: () => void,
): UseEnrolledStudentsRemovalResult {
  const { showSuccess, showError } = useAlert();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [studentToCancel, setStudentToCancel] = useState<string | null>(null);

  const requestRemove = (enrollmentId: string) => {
    setStudentToCancel(enrollmentId);
  };

  const cancelRemove = () => {
    setStudentToCancel(null);
  };

  const confirmRemove = async () => {
    if (!studentToCancel) return;

    setRemovingId(studentToCancel);
    try {
      await classesService.cancelEnrollment(studentToCancel);
      showSuccess('Alumno dado de baja correctamente.');
      if (onStudentRemoved) onStudentRemoved();
    } catch (error) {
      console.error(error);
      showError('No se pudo dar de baja al alumno.');
    } finally {
      setRemovingId(null);
      setStudentToCancel(null);
    }
  };

  return { removingId, studentToCancel, requestRemove, cancelRemove, confirmRemove };
}
