import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useAlert } from '@/ui/GlobalAlertProvider';
import { financesService, dashboardService } from '@/core/services';
import type { PaymentEntity } from '@/core/types/finances.types';
import type { FinancialBalance } from '@/core/types/dashboard.types';

export interface UseFinancesDataResult {
  payments: PaymentEntity[];
  balance: FinancialBalance | null;
  loading: boolean;
  fetchPayments: () => Promise<void>;
  fetchBalance: () => Promise<void>;
}

export function useFinancesData(): UseFinancesDataResult {
  const { current_studio_id } = useAuthStore();
  const { showError } = useAlert();

  const [payments, setPayments] = useState<PaymentEntity[]>([]);
  const [balance, setBalance] = useState<FinancialBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    if (!current_studio_id) return;

    try {
      const data = await financesService.getPayments(current_studio_id);
      setPayments(data);
    } catch (error: unknown) {
      showError('Error cargando los pagos.');
      console.error('Error fetching payments:', error);
    }
  }, [current_studio_id, showError]);

  const fetchBalance = useCallback(async () => {
    if (!current_studio_id) return;

    try {
      const data = await dashboardService.getFinancialBalance(current_studio_id);
      setBalance(data);
    } catch (error: unknown) {
      showError('Error cargando el balance.');
      console.error('Error fetching balance:', error);
    }
  }, [current_studio_id, showError]);

  const loadData = useCallback(async () => {
    if (!current_studio_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      await Promise.all([fetchPayments(), fetchBalance()]);
    } catch (error: unknown) {
      showError('Error cargando los datos financieros.');
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  }, [current_studio_id, fetchPayments, fetchBalance, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    payments,
    balance,
    loading,
    fetchPayments,
    fetchBalance,
  };
}
