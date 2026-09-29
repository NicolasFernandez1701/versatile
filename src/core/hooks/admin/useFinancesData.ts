import { useCallback } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useAlert } from '@/ui/useAlert';
import { financesService, dashboardService } from '@/core/services';
import { useAsyncResource } from '@/core/hooks/shared/useAsyncResource';
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

  const paymentsResource = useAsyncResource<PaymentEntity[]>(
    async () => {
      if (!current_studio_id) {
        throw new Error('useFinancesData requires a studio id');
      }
      return financesService.getPayments(current_studio_id);
    },
    [current_studio_id],
    {
      enabled: !!current_studio_id,
      onError: (error) => {
        showError('Error cargando los pagos.');
        console.error('Error fetching payments:', error);
      },
    },
  );

  const balanceResource = useAsyncResource<FinancialBalance>(
    async () => {
      if (!current_studio_id) {
        throw new Error('useFinancesData requires a studio id');
      }
      return dashboardService.getFinancialBalance(current_studio_id);
    },
    [current_studio_id],
    {
      enabled: !!current_studio_id,
      onError: (error) => {
        showError('Error cargando el balance.');
        console.error('Error fetching balance:', error);
      },
    },
  );

  // Independent silent refetches: refreshing payments never re-fetches the
  // balance and vice versa, and neither flips `loading`, so the finances page
  // never blanks on `handlePaymentSuccess`'s `Promise.all` path.
  const { refetch: refetchPayments } = paymentsResource;
  const { refetch: refetchBalance } = balanceResource;

  const fetchPayments = useCallback(
    () => refetchPayments({ silent: true }),
    [refetchPayments],
  );

  const fetchBalance = useCallback(
    () => refetchBalance({ silent: true }),
    [refetchBalance],
  );

  return {
    payments: paymentsResource.data ?? [],
    balance: balanceResource.data,
    loading: paymentsResource.loading || balanceResource.loading,
    fetchPayments,
    fetchBalance,
  };
}
