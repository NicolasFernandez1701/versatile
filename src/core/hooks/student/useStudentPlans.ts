import { plansService, dashboardService } from '@/core/services';
import { useAsyncResource } from '@/core/hooks/shared/useAsyncResource';
import type { PlanEntity } from '@/core/types/plans.types';
import type { StudentDashboardData } from '@/core/types/dashboard.types';

export interface UseStudentPlansResult {
  plans: PlanEntity[];
  activePlanId: string | null;
  loading: boolean;
}

/**
 * Composes two single-resource instances (AD-3) instead of one combined
 * fetcher: a transient dashboard failure no longer takes the already-fetched
 * plans down with it. Both instances keep the `[userId]` key, so a `userId`
 * change still refetches plans and dashboard exactly as before, and the
 * combined `loading` is their OR.
 */
export function useStudentPlans(userId: string | undefined): UseStudentPlansResult {
  const plansResource = useAsyncResource<PlanEntity[]>(
    async () => plansService.getActivePlans(),
    [userId],
    {
      onError: (error) => {
        console.error('Error fetching student plans:', error);
      },
    },
  );

  const dashboardResource = useAsyncResource<StudentDashboardData>(
    async () => {
      if (!userId) {
        throw new Error('useStudentPlans requires a user id');
      }
      return dashboardService.getStudentDashboardData(userId);
    },
    [userId],
    {
      enabled: !!userId,
      onError: (error) => {
        console.error('Error fetching student plans:', error);
      },
    },
  );

  return {
    plans: plansResource.data ?? [],
    activePlanId: dashboardResource.data?.activePlan?.plan_id ?? null,
    loading: plansResource.loading || dashboardResource.loading,
  };
}
