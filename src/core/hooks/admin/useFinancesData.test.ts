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

vi.mock('@/ui/useAlert', () => ({
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

function flushSettles(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 20);
  });
}

function actWarnings(consoleSpy: { mock: { calls: Array<Array<unknown>> } }): string[] {
  return consoleSpy.mock.calls
    .map((call) => String(call[0]))
    .filter((message) => message.includes('not wrapped in act'));
}

const mockPaymentB: PaymentEntity = {
  ...mockPayment,
  id: 'pay-002',
  amount: 30000,
};

const mockBalanceB: FinancialBalance = {
  monthlyTotal: 30000,
  annualTotal: 180000,
  monthlyByPlan: { 'Plan Trimestral': 30000 },
  annualByPlan: { 'Plan Trimestral': 180000 },
};

describe('useFinancesData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-001' });
    mockGetPayments.mockResolvedValue([mockPayment]);
    mockGetFinancialBalance.mockResolvedValue(mockBalance);
  });

  it('initializes with empty state and loading=true', async () => {
    const { result } = renderHook(() => useFinancesData());

    expect(result.current.payments).toEqual([]);
    expect(result.current.balance).toBeNull();
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
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

    let refresh!: Promise<void>;
    await act(async () => {
      refresh = result.current.fetchPayments();
    });
    await act(async () => {});
    await refresh;

    expect(mockGetPayments).toHaveBeenCalledTimes(2);
    expect(mockGetFinancialBalance).toHaveBeenCalledTimes(1);
  });

  it('fetchBalance refreshes only balance', async () => {
    const { result } = renderHook(() => useFinancesData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let refresh!: Promise<void>;
    await act(async () => {
      refresh = result.current.fetchBalance();
    });
    await act(async () => {});
    await refresh;

    expect(mockGetPayments).toHaveBeenCalledTimes(1);
    expect(mockGetFinancialBalance).toHaveBeenCalledTimes(2);
  });

  it('shows error when fetch fails', async () => {
    mockGetPayments.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useFinancesData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockShowError).toHaveBeenCalledWith('Error cargando los pagos.');
  });

  it('newest-wins: a stale studio-A response settling late never clobbers newer studio-B data', async () => {
    const paymentsGateA = deferred<PaymentEntity[]>();
    const balanceGateA = deferred<FinancialBalance>();
    const paymentsGateB = deferred<PaymentEntity[]>();
    const balanceGateB = deferred<FinancialBalance>();
    mockGetPayments
      .mockImplementationOnce(() => paymentsGateA.promise)
      .mockImplementationOnce(() => paymentsGateB.promise);
    mockGetFinancialBalance
      .mockImplementationOnce(() => balanceGateA.promise)
      .mockImplementationOnce(() => balanceGateB.promise);

    const { result, rerender } = renderHook(() => useFinancesData());

    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-B' });
    rerender();

    paymentsGateB.resolve([mockPaymentB]);
    balanceGateB.resolve(mockBalanceB);
    await waitFor(() => expect(result.current.payments).toEqual([mockPaymentB]));
    expect(result.current.balance).toEqual(mockBalanceB);

    paymentsGateA.resolve([mockPayment]);
    balanceGateA.resolve(mockBalance);
    await flushSettles();

    expect(result.current.payments).toEqual([mockPaymentB]);
    expect(result.current.balance).toEqual(mockBalanceB);
  });

  it('refreshing both resources together never flips loading (no loader flash)', async () => {
    const { result } = renderHook(() => useFinancesData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let refresh!: Promise<void>;
    await act(async () => {
      refresh = Promise.all([result.current.fetchPayments(), result.current.fetchBalance()]).then(
        () => undefined,
      );
    });
    await act(async () => {});
    await refresh;

    expect(result.current.loading).toBe(false);
    expect(mockGetPayments).toHaveBeenCalledTimes(2);
    expect(mockGetFinancialBalance).toHaveBeenCalledTimes(2);
  });

  it('commits no state after unmount (no act warnings)', async () => {
    const paymentsGate = deferred<PaymentEntity[]>();
    const balanceGate = deferred<FinancialBalance>();
    mockGetPayments.mockImplementationOnce(() => paymentsGate.promise);
    mockGetFinancialBalance.mockImplementationOnce(() => balanceGate.promise);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderHook(() => useFinancesData());
    unmount();

    paymentsGate.resolve([mockPayment]);
    balanceGate.resolve(mockBalance);
    await flushSettles();

    expect(actWarnings(consoleSpy)).toEqual([]);

    consoleSpy.mockRestore();
  });
});
