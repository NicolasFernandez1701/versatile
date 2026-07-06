import { useState, useEffect } from 'react';
import { plansService, dashboardService } from '@/core/services';
import type { PlanEntity } from '@/core/types/plans.types';

export interface UseStudentPlansResult {
  plans: PlanEntity[];
  activePlanId: string | null;
  loading: boolean;
}

export function useStudentPlans(userId: string | undefined): UseStudentPlansResult {
  const [plans, setPlans] = useState<PlanEntity[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const plansData = await plansService.getActivePlans();
        if (!mounted) return;
        setPlans(plansData);

        if (userId) {
          const dashboardData = await dashboardService.getStudentDashboardData(userId);
          if (!mounted) return;
          setActivePlanId(dashboardData.activePlan?.plan_id ?? null);
        }
      } catch (error: unknown) {
        if (!mounted) return;
        console.error('Error fetching student plans:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return {
    plans,
    activePlanId,
    loading,
  };
}
