import { useState, useEffect, useMemo } from 'react';
import { financesService } from '@/core/services/finances.service';
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
  const [isFirstPayment, setIsFirstPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch whether student has existing payments
  useEffect(() => {
    if (!studentId || !plan) {
      setIsFirstPayment(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    financesService
      .hasExistingPayments(studentId)
      .then((hasExistingPayments) => {
        if (cancelled) return;
        setIsFirstPayment(!hasExistingPayments);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, plan]);

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
  }, [plan, paymentMethod, promoDiscountPct, applyLateFee, isFirstPayment, today]);

  return { calculation, loading, error, isFirstPayment };
}
