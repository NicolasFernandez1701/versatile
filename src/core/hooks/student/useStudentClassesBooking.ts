import { useCallback } from 'react';
import { enrollmentsService } from '@/core/services';
import { useAlert } from '@/ui/GlobalAlertProvider';
import type { StudentClassLimit } from '@/core/types/dashboard.types';

export function isActivityAvailable(
  activityName: string,
  planLimits: StudentClassLimit,
): boolean {
  const quota = planLimits.perActivity[activityName];
  const totalConsumed = Object.values(planLimits.perActivity).reduce(
    (sum, q) => sum + q.consumed,
    0,
  );

  if (quota && quota.remaining <= 0) return false;
  if (totalConsumed >= planLimits.limit && planLimits.limit > 0) return false;
  return true;
}

interface UseEnrollClassParams {
  studentId: string | undefined;
  refresh: () => Promise<void>;
}

export function useEnrollClass({ studentId, refresh }: UseEnrollClassParams) {
  const { showSuccess, showError } = useAlert();

  const enroll = useCallback(
    async (classId: string, classDate: Date) => {
      if (!studentId) return;
      try {
        const dateStr = classDate.toISOString().split('T')[0];
        await enrollmentsService.enrollStudent(studentId, classId, dateStr);
        showSuccess('¡Lugar reservado con éxito!');
        await refresh();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        showError(message);
      }
    },
    [studentId, refresh, showSuccess, showError],
  );

  return { enroll };
}

export function useCancelClass({ refresh }: { refresh: () => Promise<void> }) {
  const { showSuccess, showError } = useAlert();

  const cancel = useCallback(
    async (reservationId: string) => {
      try {
        await enrollmentsService.unenrollStudent(reservationId);
        showSuccess('Reserva cancelada. Cupo liberado.');
        await refresh();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        showError(message);
      }
    },
    [refresh, showSuccess, showError],
  );

  return { cancel };
}
