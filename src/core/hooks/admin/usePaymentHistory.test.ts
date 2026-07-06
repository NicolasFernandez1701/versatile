import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePaymentHistory } from './usePaymentHistory';
import type { PaymentEntity } from '@/core/types/finances.types';

const createPayment = (overrides: Partial<PaymentEntity> = {}): PaymentEntity => ({
  id: 'pmt-001',
  student_id: 'student-001',
  amount: 10000,
  payment_date: '2026-07-01',
  expiration_date: '2026-08-01',
  plan_details: 'Plan Mensual',
  payment_method: 'efectivo',
  original_amount: 10000,
  discount_applied: 0,
  surcharge_applied: 0,
  late_payment: false,
  late_fee_applied: false,
  is_first_payment: false,
  created_at: '2026-07-01',
  ...overrides,
});

const payments: PaymentEntity[] = [
  createPayment({
    id: 'pmt-001',
    profiles: { id: 'student-001', full_name: 'Ana García' },
    plan_details: 'Básico',
    payment_method: 'efectivo',
  }),
  createPayment({
    id: 'pmt-002',
    profiles: { id: 'student-002', full_name: 'Bruno López' },
    plan_details: 'Premium',
    payment_method: 'transferencia',
  }),
  createPayment({
    id: 'pmt-003',
    profiles: { id: 'student-003', full_name: 'Carla Méndez' },
    plan_details: 'Básico',
    payment_method: 'transferencia',
  }),
  createPayment({
    id: 'pmt-004',
    profiles: { id: 'student-004', full_name: 'Ana Torres' },
    plan_details: 'Elite',
    payment_method: 'efectivo',
  }),
  createPayment({
    id: 'pmt-005',
    profiles: { id: 'student-005', full_name: 'Diego Ríos' },
    plan_details: 'Premium',
    payment_method: 'efectivo',
  }),
  createPayment({
    id: 'pmt-006',
    profiles: { id: 'student-006', full_name: 'Elena Vázquez' },
    plan_details: 'Básico',
    payment_method: 'transferencia',
  }),
  createPayment({
    id: 'pmt-007',
    profiles: { id: 'student-007', full_name: 'Federico Pérez' },
    plan_details: 'Premium',
    payment_method: 'efectivo',
  }),
  createPayment({
    id: 'pmt-008',
    profiles: { id: 'student-008', full_name: 'Gracia Núñez' },
    plan_details: 'Elite',
    payment_method: 'transferencia',
  }),
];

describe('usePaymentHistory', () => {
  it('filters by search term matching name', () => {
    const { result } = renderHook(() => usePaymentHistory(payments));

    act(() => {
      result.current.setSearchTerm('Ana');
    });

    expect(result.current.filteredPayments).toHaveLength(2);
    expect(result.current.filteredPayments.map((p) => p.id)).toEqual(['pmt-001', 'pmt-004']);
  });

  it('filters by search term matching plan details', () => {
    const { result } = renderHook(() => usePaymentHistory(payments));

    act(() => {
      result.current.setSearchTerm('premium');
    });

    expect(result.current.filteredPayments).toHaveLength(3);
    expect(result.current.filteredPayments.map((p) => p.id)).toEqual(['pmt-002', 'pmt-005', 'pmt-007']);
  });

  it('filters by payment method', () => {
    const { result } = renderHook(() => usePaymentHistory(payments));

    act(() => {
      result.current.setMethodFilter('transferencia');
    });

    expect(result.current.filteredPayments).toHaveLength(4);
    expect(result.current.filteredPayments.every((p) => p.payment_method === 'transferencia')).toBe(true);
  });

  it('combines search and method filters', () => {
    const { result } = renderHook(() => usePaymentHistory(payments));

    act(() => {
      result.current.setSearchTerm('Carla');
      result.current.setMethodFilter('transferencia');
    });

    expect(result.current.filteredPayments).toHaveLength(1);
    expect(result.current.filteredPayments[0].id).toBe('pmt-003');
  });

  it('paginates results on page 1', () => {
    const { result } = renderHook(() => usePaymentHistory(payments));

    expect(result.current.paginatedPayments).toHaveLength(7);
    expect(result.current.paginatedPayments[0].id).toBe('pmt-001');
    expect(result.current.paginatedPayments[6].id).toBe('pmt-007');
    expect(result.current.totalPages).toBe(2);
  });

  it('paginates results on page 2', () => {
    const { result } = renderHook(() => usePaymentHistory(payments));

    act(() => {
      result.current.setCurrentPage(2);
    });

    expect(result.current.paginatedPayments).toHaveLength(1);
    expect(result.current.paginatedPayments[0].id).toBe('pmt-008');
  });

  it('returns empty paginated results when current page exceeds total pages', () => {
    const { result } = renderHook(() => usePaymentHistory(payments));

    act(() => {
      result.current.setCurrentPage(10);
    });

    expect(result.current.paginatedPayments).toEqual([]);
    expect(result.current.totalPages).toBe(2);
  });

  it('resets page to 1 when search term changes', () => {
    const { result } = renderHook(() => usePaymentHistory(payments));

    act(() => {
      result.current.setCurrentPage(2);
    });
    expect(result.current.currentPage).toBe(2);

    act(() => {
      result.current.setSearchTerm('Plan');
    });

    expect(result.current.currentPage).toBe(1);
  });

  it('resets page to 1 when method filter changes', () => {
    const { result } = renderHook(() => usePaymentHistory(payments));

    act(() => {
      result.current.setCurrentPage(2);
    });
    expect(result.current.currentPage).toBe(2);

    act(() => {
      result.current.setMethodFilter('transferencia');
    });

    expect(result.current.currentPage).toBe(1);
  });

  it('handles empty payments array', () => {
    const { result } = renderHook(() => usePaymentHistory([]));

    expect(result.current.filteredPayments).toEqual([]);
    expect(result.current.paginatedPayments).toEqual([]);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.ITEMS_PER_PAGE).toBe(7);
  });
});
