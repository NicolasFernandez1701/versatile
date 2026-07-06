import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { plansService, classesService } from '@/core/services';
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

export function usePlansManagement(): UsePlansManagementResult {
  const { current_studio_id } = useAuthStore();
  const { showError, showSuccess } = useAlert();

  const [plans, setPlans] = useState<PlanEntity[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassEntity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    if (!current_studio_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [plansData, classesData] = await Promise.all([
        plansService.getPlans(),
        classesService.getClasses(current_studio_id),
      ]);
      setPlans(plansData);
      setAvailableClasses(classesData);
    } catch (error: unknown) {
      showError('Error cargando los planes.');
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  }, [current_studio_id, showError]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const createPlan = useCallback(
    async (data: CreatePlanDTO, activities: CreatePlanActivityDTO[]) => {
      try {
        await plansService.createPlanWithActivities(data, activities);
        await fetchPlans();
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
        showSuccess('Plan eliminado con éxito.');
      } catch (error: unknown) {
        showError('Error eliminando el plan.');
      }
    },
    [fetchPlans, showError, showSuccess],
  );

  const toggleStatus = useCallback(
    async (id: string, currentStatus: boolean) => {
      const nextStatus = !currentStatus;
      setPlans((prev) =>
        prev.map((plan) => (plan.id === id ? { ...plan, is_active: nextStatus } : plan)),
      );

      try {
        await plansService.togglePlanStatus(id, nextStatus);
        showSuccess('Estado actualizado con éxito.');
      } catch (error: unknown) {
        setPlans((prev) =>
          prev.map((plan) => (plan.id === id ? { ...plan, is_active: currentStatus } : plan)),
        );
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
