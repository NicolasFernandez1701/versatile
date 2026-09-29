import { useAsyncResource } from '@/core/hooks/shared/useAsyncResource';
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

const EMPTY_PLAN_LIMITS: StudentClassLimit = {
  limit: 0,
  classesPerWeek: 0,
  perActivity: {},
};

interface StudentClassesResource {
  classesList: ClassEntity[];
  reservations: AttendanceRecord[];
  planLimits: StudentClassLimit;
}

// Content-derived fetch key: `weekDates` is recreated per render, so the key
// depends on day content rather than object identity — otherwise every render
// would refetch. Empty content yields an empty key, which disables the fetch
// (G-Q1: a disabled gate reports loading:false, never a stuck spinner).
function weekKeyFor(weekDates: Record<number, Date>): string {
  return Object.keys(weekDates)
    .map(Number)
    .sort((a, b) => a - b)
    .map((day) => weekDates[day].getTime())
    .join(',');
}

export function useStudentClassesData(weekDates: Record<number, Date>): UseStudentClassesDataResult {
  const { user, current_studio_id } = useAuthStore();
  const { showError } = useAlert();
  // Stable scalar id: the fetcher only needs the id string, so depend on the
  // id itself instead of the whole user object.
  const userId = user?.id;
  const weekKey = weekKeyFor(weekDates);

  const resource = useAsyncResource<StudentClassesResource>(
    async () => {
      if (!userId) {
        throw new Error('useStudentClassesData requires a user id');
      }
      const [cData, resData, classLimit] = await Promise.all([
        classesService.getClasses(current_studio_id || ''),
        attendanceService.getStudentAttendances(userId),
        dashboardService.getStudentClassLimit(userId),
      ]);
      return {
        classesList: cData.filter((c) => c.is_active !== false),
        reservations: resData,
        planLimits: classLimit,
      };
    },
    [weekKey],
    {
      enabled: weekKey !== '' && !!userId,
      onError: (error) => {
        showError('Error cargando los datos: ' + error.message);
      },
    },
  );

  const loadData = resource.refetch;

  return {
    loading: resource.loading,
    classesList: resource.data?.classesList ?? [],
    reservations: resource.data?.reservations ?? [],
    planLimits: resource.data?.planLimits ?? EMPTY_PLAN_LIMITS,
    loadData,
  };
}
