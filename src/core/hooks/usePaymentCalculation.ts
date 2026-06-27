import { useState, useEffect } from 'react';
import { financesService } from '../services/finances.service';
import { calculatePayment, type PaymentCalcResult } from '../utils/paymentCalculator';

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
  const [calculation, setCalculation] = useState<PaymentCalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFirstPayment, setIsFirstPayment] = useState(false);

  useEffect(() => {
    if (!studentId || !plan) {
      setCalculation(null);
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

        const firstPayment = !hasExistingPayments;
        setIsFirstPayment(firstPayment);

        const calc = calculatePayment({
          basePrice: Number(plan.price),
          paymentMethod,
          promoDiscountPct,
          applyLateFee,
          isFirstPayment: firstPayment,
          today,
        });

        setCalculation(calc);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, plan, paymentMethod, promoDiscountPct, applyLateFee]);

  return { calculation, loading, error, isFirstPayment };
}
