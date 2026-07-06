import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStudentStatus } from './useStudentStatus';

describe('useStudentStatus', () => {
  it('returns Al Día when expiration date is in the future', () => {
    const { result } = renderHook(() => useStudentStatus());
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    expect(result.current.getStatus(futureDate.toISOString().split('T')[0])).toBe('Al Día');
  });

  it('returns Vencido when expiration date is in the past', () => {
    const { result } = renderHook(() => useStudentStatus());
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);

    expect(result.current.getStatus(pastDate.toISOString().split('T')[0])).toBe('Vencido');
  });

  it('returns Pendiente when expiration date is missing but has plan', () => {
    const { result } = renderHook(() => useStudentStatus());

    expect(result.current.getStatus(null)).toBe('Pendiente');
    expect(result.current.getStatus(undefined)).toBe('Pendiente');
  });

  it('returns Sin Plan when hasPlan is false', () => {
    const { result } = renderHook(() => useStudentStatus());

    expect(result.current.getStatus(null, false)).toBe('Sin Plan');
    expect(result.current.getStatus('2026-12-31', false)).toBe('Sin Plan');
  });
});
