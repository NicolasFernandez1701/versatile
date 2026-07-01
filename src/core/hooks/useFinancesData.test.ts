import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFinancesData } from './useFinancesData';
import type { PaymentEntity } from '@/core/types/finances.types';
import type { FinancialBalance } from '@/core/types/dashboard.types';

const mockGetPayments = vi.hoisted(() => vi.fn());
const mockGetFinancialBalance = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  financesService: {
    getPayments: mockGetPayments,
  },
  dashboardService: {
    getFinancialBalance: mockGetFinancialBalance,
  },
}));

vi.mock('@/core/components/GlobalAlertProvider', () => ({
  useAlert: () => ({ showError: mockShowError }),
}));

vi.mock('@/core/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    (selector?: (state: ReturnType<typeof mockUseAuthStore>) => unknown) => {
      const state = mockUseAuthStore();
      if (typeof selector === 'function') return selector(state);
      return state;
    },
    { getState: () => mockUseAuthStore() },
  ),
}));

const mockPayment: PaymentEntity = {
  id: 'pay-001',
  student_id: 'student-001',
  amount: 25000,
  payment_date: '2026-07-01',
  expiration_date: '2026-07-31',
  plan_details: 'Plan Mensual',
  payment_method: 'transferencia',
  original_amount: 25000,
  discount_applied: 0,
  surcharge_applied: 0,
  late_payment: false,
  late_fee_applied: false,
  is_first_payment: false,
  created_at: '2026-07-01',
  profiles: { id: 'student-001', full_name: 'Juan Pérez' },
};

const mockBalance: FinancialBalance = {
  monthlyTotal: 25000,
  annualTotal: 150000,
  monthlyByPlan: { 'Plan Mensual': 25000 },
  annualByPlan: { 'Plan Mensual': 150000 },
};

describe('useFinancesData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-001' });
    mockGetPayments.mockResolvedValue([mockPayment]);
    mockGetFinancialBalance.mockResolvedValue(mockBalance);
  });

  it('initializes with empty state and loading=true', () => {
    const { result } = renderHook(() => useFinancesData());

    expect(result.current.payments).toEqual([]);
    expect(result.current.balance).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('fetches payments and balance in parallel on mount', async () => {
    const { result } = renderHook(() => useFinancesData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetPayments).toHaveBeenCalledWith('studio-001');
    expect(mockGetFinancialBalance).toHaveBeenCalledWith('studio-001');
    expect(result.current.payments).toEqual([mockPayment]);
    expect(result.current.balance).toEqual(mockBalance);
  });

  it('does not fetch when studio id is missing', async () => {
    mockUseAuthStore.mockReturnValue({ current_studio_id: null });

    const { result } = renderHook(() => useFinancesData());

    expect(result.current.loading).toBe(false);
    expect(mockGetPayments).not.toHaveBeenCalled();
    expect(mockGetFinancialBalance).not.toHaveBeenCalled();
  });

  it('fetchPayments refreshes only payments', async () => {
    const { result } = renderHook(() => useFinancesData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchPayments();
    });

    expect(mockGetPayments).toHaveBeenCalledTimes(2);
    expect(mockGetFinancialBalance).toHaveBeenCalledTimes(1);
  });

  it('fetchBalance refreshes only balance', async () => {
    const { result } = renderHook(() => useFinancesData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchBalance();
    });

    expect(mockGetPayments).toHaveBeenCalledTimes(1);
    expect(mockGetFinancialBalance).toHaveBeenCalledTimes(2);
  });

  it('shows error when fetch fails', async () => {
    mockGetPayments.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useFinancesData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockShowError).toHaveBeenCalledWith('Error cargando los pagos.');
  });
});
