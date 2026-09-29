import { useState, useCallback } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useAlert } from '@/ui/useAlert';
import { plansService, classesService } from '@/core/services';
import { useAsyncResource } from '@/core/hooks/shared/useAsyncResource';
import type { PlanEntity, CreatePlanDTO, CreatePlanActivityDTO } from '@/core/types/plans.types';
import type { ClassEntity } from '@/core/types/classes.types';

export interface UsePlansManagementResult {
  plans: PlanEntity[];
  availableClasses: ClassEntity[];
  loading: boolean;
  fetchPlans: () => Promise<void>;
  createPlan: (data: CreatePlanDTO, activities: CreatePlanActivityDTO[]) => Promise<void>;
  updatePlan: (id: string, data: CreatePlanDTO, activities: CreatePlanActivityDTO[]) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  toggleStatus: (id: string, currentStatus: boolean) => Promise<void>;
}

interface PlansResource {
  plans: PlanEntity[];
  availableClasses: ClassEntity[];
}

export function usePlansManagement(): UsePlansManagementResult {
  const { current_studio_id } = useAuthStore();
  const { showError, showSuccess } = useAlert();

  const resource = useAsyncResource<PlansResource>(
    async () => {
      if (!current_studio_id) {
        throw new Error('usePlansManagement requires a studio id');
      }
      const [plansData, classesData] = await Promise.all([
        plansService.getPlans(),
        classesService.getClasses(current_studio_id),
      ]);
      return { plans: plansData, availableClasses: classesData };
    },
    [current_studio_id],
    {
      enabled: !!current_studio_id,
      onError: (error) => {
        showError('Error cargando los planes.');
        console.error('Error fetching plans:', error);
      },
    },
  );

  const fetchPlans = resource.refetch;

  // Optimistic status overrides: same contract as useClassesManagement —
  // instant toggle, kept until the next server refresh, dropped on failure.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, boolean>>({});

  const plans = (resource.data?.plans ?? []).map((plan) => {
    const override = statusOverrides[plan.id];
    return override === undefined ? plan : { ...plan, is_active: override };
  });
  const availableClasses = resource.data?.availableClasses ?? [];
  const loading = resource.loading;

  const createPlan = useCallback(
    async (data: CreatePlanDTO, activities: CreatePlanActivityDTO[]) => {
      try {
        await plansService.createPlanWithActivities(data, activities);
        await fetchPlans();
        setStatusOverrides({});
        showSuccess('Plan creado con éxito.');
      } catch (error: unknown) {
        showError(error instanceof Error ? error.message : 'Error creando el plan.');
      }
    },
    [fetchPlans, showError, showSuccess],
  );

  const updatePlan = useCallback(
    async (id: string, data: CreatePlanDTO, activities: CreatePlanActivityDTO[]) => {
      try {
        await plansService.updatePlanWithActivities(id, data, activities);
        await fetchPlans();
        setStatusOverrides({});
        showSuccess('Plan actualizado con éxito.');
      } catch (error: unknown) {
        showError(error instanceof Error ? error.message : 'Error actualizando el plan.');
      }
    },
    [fetchPlans, showError, showSuccess],
  );

  const deletePlan = useCallback(
    async (id: string) => {
      try {
        await plansService.deletePlan(id);
        await fetchPlans();
        setStatusOverrides({});
        showSuccess('Plan eliminado con éxito.');
      } catch {
        showError('Error eliminando el plan.');
      }
    },
    [fetchPlans, showError, showSuccess],
  );

  const toggleStatus = useCallback(
    async (id: string, currentStatus: boolean) => {
      const nextStatus = !currentStatus;
      setStatusOverrides((prev) => ({ ...prev, [id]: nextStatus }));

      try {
        await plansService.togglePlanStatus(id, nextStatus);
        showSuccess('Estado actualizado con éxito.');
      } catch {
        setStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        showError('Error actualizando el estado.');
      }
    },
    [showError, showSuccess],
  );

  return {
    plans,
    availableClasses,
    loading,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
    toggleStatus,
  };
}
