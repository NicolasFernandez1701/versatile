import { useState, useEffect, useCallback } from 'react';
import { plansService } from '@/core/services';
import { useAlert } from '@/ui/GlobalAlertProvider';
import type { PlanEntity } from '@/core/types/plans.types';

export interface PlanFormActivity {
  activity_name: string;
  classes_per_week: number | string;
}

export interface UsePlanFormOptions {
  initialData?: PlanEntity | null;
  onSuccess?: () => void;
}

export interface UsePlanFormResult {
  name: string;
  price: string;
  classesPerWeek: number;
  isActive: boolean;
  activities: PlanFormActivity[];
  loading: boolean;
  error: string;
  setField: (field: string, value: string | number | boolean) => void;
  addActivity: () => void;
  removeActivity: (index: number) => void;
  updateActivity: (index: number, field: string, value: string | number) => void;
  calculateSuggestedPrice: () => void;
  handleSubmit: () => Promise<void>;
}

const SUGGESTED_PRICE_PER_CLASS = 2000;

export function usePlanForm({ initialData, onSuccess }: UsePlanFormOptions = {}): UsePlanFormResult {
  const { showError, showSuccess } = useAlert();

  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData ? String(initialData.price) : '');
  const [classesPerWeek, setClassesPerWeek] = useState(initialData?.classes_per_week || 0);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [activities, setActivities] = useState<PlanFormActivity[]>(
    initialData?.plan_activities
      ? initialData.plan_activities.map((a) => ({
          activity_name: a.activity_name,
          classes_per_week: a.classes_per_week,
        }))
      : [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    setName(initialData?.name || '');
    setPrice(initialData ? String(initialData.price) : '');
    setClassesPerWeek(initialData?.classes_per_week || 0);
    setIsActive(initialData?.is_active ?? true);
    setActivities(
      initialData?.plan_activities
        ? initialData.plan_activities.map((a) => ({
            activity_name: a.activity_name,
            classes_per_week: a.classes_per_week,
          }))
        : [],
    );
    setError('');
  }, [initialData]);

  useEffect(() => {
    reset();
  }, [initialData, reset]);

  const setField = useCallback((field: string, value: string | number | boolean) => {
    switch (field) {
      case 'name':
        setName(String(value));
        break;
      case 'price':
        setPrice(String(value));
        break;
      case 'classesPerWeek':
        setClassesPerWeek(Number(value));
        break;
      case 'isActive':
        setIsActive(Boolean(value));
        break;
    }
  }, []);

  const totalClassesFor = useCallback((acts: PlanFormActivity[]) => {
    return acts.reduce((sum, a) => sum + Number(a.classes_per_week || 0), 0);
  }, []);

  const addActivity = useCallback(() => {
    setActivities((prev) => {
      const next = [...prev, { activity_name: '', classes_per_week: 1 }];
      setClassesPerWeek(totalClassesFor(next));
      return next;
    });
  }, [totalClassesFor]);

  const removeActivity = useCallback((index: number) => {
    setActivities((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      setClassesPerWeek(totalClassesFor(next));
      return next;
    });
  }, [totalClassesFor]);

  const updateActivity = useCallback((index: number, field: string, value: string | number) => {
    setActivities((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      setClassesPerWeek(totalClassesFor(next));
      return next;
    });
  }, [totalClassesFor]);

  const calculateSuggestedPrice = useCallback(() => {
    setPrice(String(classesPerWeek * SUGGESTED_PRICE_PER_CLASS));
  }, [classesPerWeek]);

  const handleSubmit = useCallback(async () => {
    setError('');

    const validActivities = activities.filter(
      (a) => a.activity_name.trim() !== '' && Number(a.classes_per_week) > 0,
    );

    if (!name.trim() || !price.trim() || validActivities.length === 0) {
      const message = 'Completa el nombre, el precio y al menos una actividad válida.';
      setError(message);
      showError(`Error: ${message}`);
      return;
    }

    const totalClassesPerWeek = validActivities.reduce(
      (sum, a) => sum + Number(a.classes_per_week),
      0,
    );

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        price: Number(price),
        classes_per_week: totalClassesPerWeek,
        is_active: isActive,
      };

      const formattedActivities = validActivities.map((a) => ({
        activity_name: a.activity_name.trim(),
        classes_per_week: Number(a.classes_per_week),
      }));

      if (initialData?.id) {
        await plansService.updatePlanWithActivities(initialData.id, payload, formattedActivities);
        showSuccess('Plan actualizado con éxito.');
      } else {
        await plansService.createPlanWithActivities(payload, formattedActivities);
        showSuccess('Plan creado con éxito.');
      }
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      showError(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [name, price, isActive, activities, initialData, onSuccess, showError, showSuccess]);

  return {
    name,
    price,
    classesPerWeek,
    isActive,
    activities,
    loading,
    error,
    setField,
    addActivity,
    removeActivity,
    updateActivity,
    calculateSuggestedPrice,
    handleSubmit,
  };
}
