import { useMemo } from 'react';
import { financesService } from '@/core/services/finances.service';
import { useAsyncResource } from '@/core/hooks/shared/useAsyncResource';
import { calculatePayment, type PaymentCalcResult } from '@/core/utils/paymentCalculator';

export interface PlanInfo {
  id: string;
  price: number;
  name: string;
}

export interface UsePaymentCalculationParams {
  studentId: string | null;
  plan: PlanInfo | null | undefined;
  paymentMethod: 'efectivo' | 'transferencia';
  promoDiscountPct?: number;
  applyLateFee?: boolean;
  today?: Date;
}

export interface UsePaymentCalculationResult {
  calculation: PaymentCalcResult | null;
  loading: boolean;
  error: Error | null;
  isFirstPayment: boolean;
}

export function usePaymentCalculation({
  studentId,
  plan,
  paymentMethod,
  promoDiscountPct = 0,
  applyLateFee = false,
  today = new Date(),
}: UsePaymentCalculationParams): UsePaymentCalculationResult {
  const enabled = !!(studentId && plan);

  // Whether the student has existing payments. Keyed on the student only:
  // the fetcher never depends on the plan, so a plan-only change does not
  // refetch (removes a pointless loading flash). Newest-wins and unmount
  // safety come from the shared primitive.
  const resource = useAsyncResource<boolean>(
    async () => {
      if (!studentId) {
        throw new Error('usePaymentCalculation requires a studentId');
      }
      const hasExistingPayments = await financesService.hasExistingPayments(studentId);
      return !hasExistingPayments;
    },
    [studentId],
    { enabled },
  );

  const isFirstPayment = enabled ? (resource.data ?? false) : false;
  const loading = resource.loading;
  const error = resource.error;

  // Pure calculation — no side effects
  const calculation = useMemo<PaymentCalcResult | null>(() => {
    if (!studentId || !plan) return null;

    return calculatePayment({
      basePrice: Number(plan.price),
      paymentMethod,
      promoDiscountPct,
      applyLateFee,
      isFirstPayment,
      today,
    });
  }, [studentId, plan, paymentMethod, promoDiscountPct, applyLateFee, isFirstPayment, today]);

  return { calculation, loading, error, isFirstPayment };
}
