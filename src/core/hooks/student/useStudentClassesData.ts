import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { classesService, attendanceService, dashboardService } from '@/core/services';
import { useAlert } from '@/ui/useAlert';
import type { AttendanceRecord } from '@/core/types/attendance.types';
import type { ClassEntity } from '@/core/types/classes.types';
import type { StudentClassLimit } from '@/core/types/dashboard.types';

export interface UseStudentClassesDataResult {
  loading: boolean;
  classesList: ClassEntity[];
  reservations: AttendanceRecord[];
  planLimits: StudentClassLimit;
  loadData: () => Promise<void>;
}

export function useStudentClassesData(weekDates: Record<number, Date>): UseStudentClassesDataResult {
  const { user, current_studio_id } = useAuthStore();
  const { showError } = useAlert();
  // Stable scalar id: the fetcher only needs the id string, so depend on the
  // id itself instead of the whole user object. This keeps the manual memo
  // deps exactly matching what the compiler infers (no behavior change:
  // loadData is still recreated exactly when the id changes).
  const userId = user?.id;

  const [loading, setLoading] = useState(true);
  const [classesList, setClassesList] = useState<ClassEntity[]>([]);
  const [reservations, setReservations] = useState<AttendanceRecord[]>([]);
  const [planLimits, setPlanLimits] = useState<StudentClassLimit>({
    limit: 0,
    classesPerWeek: 0,
    perActivity: {},
  });

  const loadData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const [cData, resData, classLimit] = await Promise.all([
        classesService.getClasses(current_studio_id || ''),
        attendanceService.getStudentAttendances(userId),
        dashboardService.getStudentClassLimit(userId),
      ]);

      setClassesList(cData.filter((c) => c.is_active !== false));
      setReservations(resData);
      setPlanLimits(classLimit);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      showError('Error cargando los datos: ' + message);
    } finally {
      setLoading(false);
    }
  }, [userId, current_studio_id, showError]);

  useEffect(() => {
    if (Object.keys(weekDates).length > 0) {
      loadData();
    }
  }, [weekDates, loadData]);

  return {
    loading,
    classesList,
    reservations,
    planLimits,
    loadData,
  };
}
