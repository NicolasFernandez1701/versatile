import { dashboardService } from '@/core/services';
import { useAsyncResource } from '@/core/hooks/shared/useAsyncResource';
import type { StudentDashboardData, StudentClassLimit } from '@/core/types/dashboard.types';

export interface UseStudentDashboardResult {
  data: StudentDashboardData | null;
  classLimit: StudentClassLimit | null;
  loading: boolean;
}

interface StudentDashboardResource {
  data: StudentDashboardData;
  classLimit: StudentClassLimit;
}

export function useStudentDashboard(userId: string | undefined): UseStudentDashboardResult {
  const resource = useAsyncResource<StudentDashboardResource>(
    async () => {
      if (!userId) {
        throw new Error('useStudentDashboard requires a userId');
      }
      const [dashboardData, limitData] = await Promise.all([
        dashboardService.getStudentDashboardData(userId),
        dashboardService.getStudentClassLimit(userId),
      ]);
      return { data: dashboardData, classLimit: limitData };
    },
    [userId],
    {
      enabled: !!userId,
      onError: (error) => {
        console.error('Error fetching student dashboard:', error);
      },
    },
  );

  return {
    data: resource.data?.data ?? null,
    classLimit: resource.data?.classLimit ?? null,
    loading: resource.loading,
  };
}
