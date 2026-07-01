import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { classesService, attendanceService, dashboardService } from '../services';
import { useAlert } from '../components/GlobalAlertProvider';
import type { AttendanceRecord } from '../services/attendance.service';
import type { ClassEntity } from '../types/classes.types';
import type { StudentClassLimit } from '../types/dashboard.types';

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

  const [loading, setLoading] = useState(true);
  const [classesList, setClassesList] = useState<ClassEntity[]>([]);
  const [reservations, setReservations] = useState<AttendanceRecord[]>([]);
  const [planLimits, setPlanLimits] = useState<StudentClassLimit>({
    limit: 0,
    classesPerWeek: 0,
    perActivity: {},
  });

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const [cData, resData, classLimit] = await Promise.all([
        classesService.getClasses(current_studio_id || ''),
        attendanceService.getStudentAttendances(user.id),
        dashboardService.getStudentClassLimit(user.id),
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
  }, [user?.id, current_studio_id, showError]);

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
