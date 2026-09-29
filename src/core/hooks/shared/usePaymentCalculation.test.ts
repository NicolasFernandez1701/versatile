import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePaymentCalculation } from './usePaymentCalculation';
import { financesService } from '@/core/services/finances.service';

const mockPlan = {
  id: 'plan-001',
  price: 30000,
  name: 'Plan Mensual',
};

const fixedToday = new Date(2024, 5, 15); // June 15, 2024

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

describe('usePaymentCalculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null calculation and isFirstPayment=false when no student is selected', () => {
    const { result } = renderHook(() =>
      usePaymentCalculation({
        studentId: null,
        plan: mockPlan,
        paymentMethod: 'transferencia',
        promoDiscountPct: 0,
        applyLateFee: false,
        today: fixedToday,
      })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.calculation).toBeNull();
    expect(result.current.isFirstPayment).toBe(false);
  });

  it('calculates a prorated first payment when the student has no previous payments', async () => {
    vi.spyOn(financesService, 'hasExistingPayments').mockResolvedValueOnce(false);

    const { result } = renderHook(() =>
      usePaymentCalculation({
        studentId: 'stu-001',
        plan: mockPlan,
        paymentMethod: 'transferencia',
        promoDiscountPct: 0,
        applyLateFee: false,
        today: fixedToday,
      })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(financesService.hasExistingPayments).toHaveBeenCalledWith('stu-001');
    expect(result.current.isFirstPayment).toBe(true);
    expect(result.current.calculation).not.toBeNull();
    expect(result.current.calculation?.proratedBase).toBeCloseTo(16000, 2); // 16/30 * 30000
    expect(result.current.calculation?.expirationDate).toBe('2024-06-30');
  });

  it('calculates a full recurring payment when the student already has payments', async () => {
    vi.spyOn(financesService, 'hasExistingPayments').mockResolvedValueOnce(true);

    const { result } = renderHook(() =>
      usePaymentCalculation({
        studentId: 'stu-002',
        plan: mockPlan,
        paymentMethod: 'transferencia',
        promoDiscountPct: 0,
        applyLateFee: false,
        today: fixedToday,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isFirstPayment).toBe(false);
    expect(result.current.calculation?.proratedBase).toBeCloseTo(30000, 2);
    expect(result.current.calculation?.total).toBeCloseTo(30000, 2);
  });

  it('applies admin toggles (payment method, late fee, promo) to the calculation', async () => {
    vi.spyOn(financesService, 'hasExistingPayments').mockResolvedValueOnce(false);

    const { result } = renderHook(() =>
      usePaymentCalculation({
        studentId: 'stu-003',
        plan: mockPlan,
        paymentMethod: 'efectivo',
        promoDiscountPct: 10,
        applyLateFee: true,
        today: fixedToday,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.calculation?.cashDiscountAmount).toBeCloseTo(2400, 2); // 15% of 16000
    expect(result.current.calculation?.promoDiscountAmount).toBeCloseTo(1600, 2); // 10% of 16000
    expect(result.current.calculation?.lateFeeAmount).toBeCloseTo(0, 2); // suppressed for first payment
  });

  it('exposes an error when the payment history query fails', async () => {
    vi.spyOn(financesService, 'hasExistingPayments').mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      usePaymentCalculation({
        studentId: 'stu-004',
        plan: mockPlan,
        paymentMethod: 'transferencia',
        promoDiscountPct: 0,
        applyLateFee: false,
        today: fixedToday,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    // calculation is computed independently — defaults to isFirstPayment=false on fetch error
  });

  it('newest-wins: a stale student response settling late never clobbers newer isFirstPayment', async () => {
    const gateA = deferred<boolean>();
    const gateB = deferred<boolean>();
    vi.spyOn(financesService, 'hasExistingPayments')
      .mockImplementationOnce(() => gateA.promise)
      .mockImplementationOnce(() => gateB.promise);

    const { result, rerender } = renderHook(
      ({ studentId }: { studentId: string | null }) =>
        usePaymentCalculation({
          studentId,
          plan: mockPlan,
          paymentMethod: 'transferencia',
          promoDiscountPct: 0,
          applyLateFee: false,
          today: fixedToday,
        }),
      { initialProps: { studentId: 'stu-A' as string | null } },
    );

    rerender({ studentId: 'stu-B' });

    gateB.resolve(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isFirstPayment).toBe(false);

    gateA.resolve(false);
    await flushSettles();

    expect(result.current.isFirstPayment).toBe(false);
  });

  it('commits no state after unmount (no act warnings)', async () => {
    const gate = deferred<boolean>();
    vi.spyOn(financesService, 'hasExistingPayments').mockImplementationOnce(() => gate.promise);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderHook(() =>
      usePaymentCalculation({
        studentId: 'stu-009',
        plan: mockPlan,
        paymentMethod: 'transferencia',
        promoDiscountPct: 0,
        applyLateFee: false,
        today: fixedToday,
      })
    );
    unmount();

    gate.resolve(false);
    await flushSettles();

    expect(actWarnings(consoleSpy)).toEqual([]);

    consoleSpy.mockRestore();
  });

  it('recomputes the calculation when only studentId changes (null -> selected)', async () => {
    // hasExistingPayments=true keeps isFirstPayment=false before AND after,
    // so only the studentId change can trigger a recompute.
    vi.spyOn(financesService, 'hasExistingPayments').mockResolvedValue(true);

    const { result, rerender } = renderHook(
      ({ studentId }: { studentId: string | null }) =>
        usePaymentCalculation({
          studentId,
          plan: mockPlan,
          paymentMethod: 'transferencia',
          promoDiscountPct: 0,
          applyLateFee: false,
          today: fixedToday,
        }),
      { initialProps: { studentId: null as string | null } },
    );

    expect(result.current.calculation).toBeNull();

    rerender({ studentId: 'stu-010' });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(financesService.hasExistingPayments).toHaveBeenCalledWith('stu-010');
    expect(result.current.calculation).not.toBeNull();
  });

  it('clears the calculation when the student is deselected (selected -> null)', async () => {
    vi.spyOn(financesService, 'hasExistingPayments').mockResolvedValueOnce(true);

    const { result, rerender } = renderHook(
      ({ studentId }: { studentId: string | null }) =>
        usePaymentCalculation({
          studentId,
          plan: mockPlan,
          paymentMethod: 'transferencia',
          promoDiscountPct: 0,
          applyLateFee: false,
          today: fixedToday,
        }),
      { initialProps: { studentId: 'stu-011' as string | null } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.calculation).not.toBeNull();

    rerender({ studentId: null });

    expect(result.current.calculation).toBeNull();
  });
});
