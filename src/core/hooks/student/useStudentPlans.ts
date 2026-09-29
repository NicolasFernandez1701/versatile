import { plansService, dashboardService } from '@/core/services';
import { useAsyncResource } from '@/core/hooks/shared/useAsyncResource';
import type { PlanEntity } from '@/core/types/plans.types';

export interface UseStudentPlansResult {
  plans: PlanEntity[];
  activePlanId: string | null;
  loading: boolean;
}

interface StudentPlansResource {
  plans: PlanEntity[];
  activePlanId: string | null;
}

export function useStudentPlans(userId: string | undefined): UseStudentPlansResult {
  const resource = useAsyncResource<StudentPlansResource>(
    async () => {
      const plansData = await plansService.getActivePlans();
      let activePlanId: string | null = null;
      if (userId) {
        const dashboardData = await dashboardService.getStudentDashboardData(userId);
        activePlanId = dashboardData.activePlan?.plan_id ?? null;
      }
      return { plans: plansData, activePlanId };
    },
    [userId],
    {
      onError: (error) => {
        console.error('Error fetching student plans:', error);
      },
    },
  );

  return {
    plans: resource.data?.plans ?? [],
    activePlanId: resource.data?.activePlanId ?? null,
    loading: resource.loading,
  };
}
