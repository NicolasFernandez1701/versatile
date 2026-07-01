import { useCallback } from 'react';
import { enrollmentsService } from '../services';
import { useAlert } from '../components/GlobalAlertProvider';
import { validateBookingWindow } from '../utils/validation';
import type { StudentClassLimit } from '../types/dashboard.types';

export interface UseStudentClassesBookingParams {
  studentId: string | undefined;
  planLimits: StudentClassLimit;
  refresh: () => Promise<void>;
}

export interface UseStudentClassesBookingResult {
  handleBooking: (
    classId: string,
    classDate: Date,
    action: 'enroll' | 'cancel',
    startTime: string,
    activityName?: string,
    existingReservationId?: string
  ) => Promise<void>;
  isActivityAvailable: (activityName: string) => boolean;
}

export function useStudentClassesBooking({
  studentId,
  planLimits,
  refresh,
}: UseStudentClassesBookingParams): UseStudentClassesBookingResult {
  const { showSuccess, showError } = useAlert();

  const isActivityAvailable = useCallback(
    (activityName: string): boolean => {
      const quota = planLimits.perActivity[activityName];
      const totalConsumed = Object.values(planLimits.perActivity).reduce(
        (sum, q) => sum + q.consumed,
        0
      );

      const activityExhausted = quota && quota.remaining <= 0;
      const totalLimitReached = totalConsumed >= planLimits.limit && planLimits.limit > 0;

      return !(activityExhausted || totalLimitReached);
    },
    [planLimits]
  );

  const handleBooking = useCallback(
    async (
      classId: string,
      classDate: Date,
      action: 'enroll' | 'cancel',
      startTime: string,
      activityName?: string,
      existingReservationId?: string
    ) => {
      if (!studentId) return;

      try {
        const window = validateBookingWindow(startTime, classDate);
        if (!window.allowed) {
          showError(window.reason!);
          return;
        }

        const dateStr = classDate.toISOString().split('T')[0];

        if (action === 'enroll') {
          if (activityName) {
            const activityQuota = planLimits.perActivity[activityName];
            if (activityQuota && activityQuota.remaining <= 0) {
              showError(`No tenés cupos disponibles para ${activityName} este mes.`);
              return;
            }
          }

          const totalConsumed = Object.values(planLimits.perActivity).reduce(
            (sum, q) => sum + q.consumed,
            0
          );
          if (totalConsumed >= planLimits.limit && planLimits.limit > 0) {
            showError(`Alcanzaste tu límite mensual de ${planLimits.limit} clases.`);
            return;
          }

          await enrollmentsService.enrollStudent(studentId, classId, dateStr);
          showSuccess('¡Lugar reservado con éxito!');
        } else if (action === 'cancel' && existingReservationId) {
          await enrollmentsService.unenrollStudent(existingReservationId);
          showSuccess('Reserva cancelada. Cupo liberado.');
        }

        await refresh();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        showError('Error al procesar reserva: ' + message);
      }
    },
    [studentId, planLimits, refresh, showSuccess, showError]
  );

  return {
    handleBooking,
    isActivityAvailable,
  };
}
