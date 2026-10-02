import { useState, useCallback, useMemo } from 'react';
import { usersService, plansService } from '@/core/services';
import { useAsyncResource } from './useAsyncResource';
import { useAlert } from '@/ui/useAlert';
import { useAuthStore } from '@/core/store/useAuthStore';
import type { UserProfile } from '@/core/types/users.types';
import type { PlanEntity } from '@/core/types/plans.types';

export interface UseStudentFormOptions {
  initialData?: UserProfile | null;
  onSuccess?: () => void;
}

export interface UseStudentFormResult {
  fullName: string;
  email: string;
  promoDiscountPct: number;
  promoExpirationDate: string;
  availablePlans: PlanEntity[];
  plansLoading: boolean;
  planId: string;
  setPlanId: (id: string) => void;
  loading: boolean;
  error: string;
  setField: (field: string, value: string | number) => void;
  reset: () => void;
  handleSubmit: () => Promise<void>;
}

export function useStudentForm({
  initialData,
  onSuccess,
}: UseStudentFormOptions = {}): UseStudentFormResult {
  const { current_studio_id } = useAuthStore();
  const { showAlert, showError, showSuccess } = useAlert();

  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [promoDiscountPct, setPromoDiscountPct] = useState(initialData?.promotion_discount_pct || 0);
  const [promoExpirationDate, setPromoExpirationDate] = useState(
    initialData?.promotion_expiration_date || '',
  );
  const [planId, setPlanId] = useState(initialData?.plan_id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Only an existing student can change plans from this form; a brand-new
  // student has no plan to pick here, so the fetch stays disabled on create.
  const plansResource = useAsyncResource<PlanEntity[]>(
    async () => plansService.getActivePlans(),
    [],
    {
      enabled: !!initialData,
      onError: (error) => {
        console.error(error);
      },
    },
  );

  const availablePlans = useMemo(() => plansResource.data ?? [], [plansResource.data]);

  const reset = useCallback(() => {
    if (initialData) {
      setFullName(initialData.full_name || '');
      setEmail(initialData.email || '');
      setPromoDiscountPct(initialData.promotion_discount_pct || 0);
      setPromoExpirationDate(initialData.promotion_expiration_date || '');
      setPlanId(initialData.plan_id ?? '');
    } else {
      setFullName('');
      setEmail('');
      setPromoDiscountPct(0);
      setPromoExpirationDate('');
      setPlanId('');
    }
    setError('');
  }, [initialData]);

  const setField = useCallback((field: string, value: string | number) => {
    const stringValue = String(value);
    switch (field) {
      case 'fullName':
        setFullName(stringValue);
        break;
      case 'email':
        setEmail(stringValue);
        break;
      case 'promoDiscountPct':
        setPromoDiscountPct(Number(value));
        break;
      case 'promoExpirationDate':
        setPromoExpirationDate(stringValue);
        break;
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    setError('');
    if (!fullName.trim() || !email.trim()) {
      const message = 'Completa el nombre completo y el correo electrónico.';
      setError(message);
      showError(`Error: ${message}`);
      return;
    }

    setLoading(true);
    try {
      if (!initialData) {
        // Intentional product decision (accepted debt): admin-created accounts
        // start with this shared default, and the app forces a password change
        // on first login (ProtectedRoute gates on has_completed_onboarding ->
        // /onboarding, whose password step says the initial password must be
        // changed). Residual window until that first login is accepted; the
        // recommended follow-up is a per-account random password shown once.
        await usersService.createUser({
          email,
          full_name: fullName,
          role: 'student',
          password: 'password123',
          studio_id: current_studio_id || '',
        });
        showSuccess('Alumno creado con éxito.');
      } else {
        await usersService.updateUser(initialData.id, {
          full_name: fullName,
          email,
          promotion_discount_pct: promoDiscountPct,
          promotion_expiration_date: promoExpirationDate || undefined,
        });

        const planChanged = planId !== '' && planId !== (initialData.plan_id ?? '');
        if (planChanged) {
          const { planChangeAudited } = await usersService.assignStudentPlan(
            initialData.id,
            planId,
          );
          if (planChangeAudited) {
            showSuccess(
              'Plan asignado. No se registró ningún pago: acordate de cobrarlo desde Finanzas.',
            );
          } else {
            showAlert(
              'Advertencia',
              'El plan se asignó, pero no se pudo guardar el registro de auditoría del cambio de plan. Avisá a soporte para conciliarlo.',
            );
          }
        } else {
          showSuccess('Alumno actualizado con éxito.');
        }
      }
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      showError(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [
    initialData,
    fullName,
    email,
    promoDiscountPct,
    promoExpirationDate,
    planId,
    current_studio_id,
    onSuccess,
    showAlert,
    showError,
    showSuccess,
  ]);

  return {
    fullName,
    email,
    promoDiscountPct,
    promoExpirationDate,
    availablePlans,
    plansLoading: plansResource.loading,
    planId,
    setPlanId,
    loading,
    error,
    setField,
    reset,
    handleSubmit,
  };
}
