import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { isActivityAvailable, useEnrollClass, useCancelClass } from './useStudentClassesBooking';
import type { StudentClassLimit } from '@/core/types/dashboard.types';

const mockEnrollStudent = vi.hoisted(() => vi.fn());
const mockUnenrollStudent = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  enrollmentsService: {
    enrollStudent: mockEnrollStudent,
    unenrollStudent: mockUnenrollStudent,
  },
}));

vi.mock('@/ui/GlobalAlertProvider', () => ({
  useAlert: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));

const basePlanLimits: StudentClassLimit = {
  limit: 12,
  classesPerWeek: 3,
  perActivity: {
    yoga: {
      activity_id: 'act-001',
      activity_name: 'Yoga',
      total: 12,
      consumed: 4,
      remaining: 8,
    },
    pilates: {
      activity_id: 'act-002',
      activity_name: 'Pilates',
      total: 4,
      consumed: 4,
      remaining: 0,
    },
  },
};

describe('isActivityAvailable', () => {
  it('returns true when activity has remaining quota', () => {
    expect(isActivityAvailable('yoga', basePlanLimits)).toBe(true);
  });

  it('returns false when activity is exhausted', () => {
    expect(isActivityAvailable('pilates', basePlanLimits)).toBe(false);
  });

  it('returns false when total limit is reached', () => {
    const limits: StudentClassLimit = {
      ...basePlanLimits,
      limit: 8,
      perActivity: {
        yoga: {
          activity_id: 'act-001',
          activity_name: 'Yoga',
          total: 12,
          consumed: 8,
          remaining: 4,
        },
      },
    };

    expect(isActivityAvailable('yoga', limits)).toBe(false);
  });

  it('returns true when activity is missing from plan limits', () => {
    expect(isActivityAvailable('crossfit', basePlanLimits)).toBe(true);
  });
});

describe('useEnrollClass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnrollStudent.mockResolvedValue(undefined);
    mockRefresh.mockResolvedValue(undefined);
  });

  it('calls enrollStudent with correct params', async () => {
    const { result } = renderHook(() => useEnrollClass({ studentId: 'student-001', refresh: mockRefresh }));

    const classDate = new Date('2026-07-10');
    await act(async () => {
      await result.current.enroll('class-001', classDate);
    });

    expect(mockEnrollStudent).toHaveBeenCalledWith('student-001', 'class-001', '2026-07-10');
  });

  it('shows success toast on success', async () => {
    const { result } = renderHook(() => useEnrollClass({ studentId: 'student-001', refresh: mockRefresh }));

    await act(async () => {
      await result.current.enroll('class-001', new Date('2026-07-10'));
    });

    expect(mockShowSuccess).toHaveBeenCalledWith('¡Lugar reservado con éxito!');
  });

  it('calls refresh after success', async () => {
    const { result } = renderHook(() => useEnrollClass({ studentId: 'student-001', refresh: mockRefresh }));

    await act(async () => {
      await result.current.enroll('class-001', new Date('2026-07-10'));
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows error on failure', async () => {
    mockEnrollStudent.mockRejectedValueOnce(new Error('No hay cupo'));

    const { result } = renderHook(() => useEnrollClass({ studentId: 'student-001', refresh: mockRefresh }));

    await act(async () => {
      await result.current.enroll('class-001', new Date('2026-07-10'));
    });

    expect(mockShowError).toHaveBeenCalledWith('No hay cupo');
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('does not call service when studentId is missing', async () => {
    const { result } = renderHook(() => useEnrollClass({ studentId: undefined, refresh: mockRefresh }));

    await act(async () => {
      await result.current.enroll('class-001', new Date('2026-07-10'));
    });

    expect(mockEnrollStudent).not.toHaveBeenCalled();
  });
});

describe('useCancelClass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnenrollStudent.mockResolvedValue(undefined);
    mockRefresh.mockResolvedValue(undefined);
  });

  it('calls unenrollStudent with reservation id', async () => {
    const { result } = renderHook(() => useCancelClass({ refresh: mockRefresh }));

    await act(async () => {
      await result.current.cancel('res-001');
    });

    expect(mockUnenrollStudent).toHaveBeenCalledWith('res-001');
  });

  it('shows success toast on success', async () => {
    const { result } = renderHook(() => useCancelClass({ refresh: mockRefresh }));

    await act(async () => {
      await result.current.cancel('res-001');
    });

    expect(mockShowSuccess).toHaveBeenCalledWith('Reserva cancelada. Cupo liberado.');
  });

  it('calls refresh after success', async () => {
    const { result } = renderHook(() => useCancelClass({ refresh: mockRefresh }));

    await act(async () => {
      await result.current.cancel('res-001');
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows error on failure', async () => {
    mockUnenrollStudent.mockRejectedValueOnce(new Error('No se pudo cancelar'));

    const { result } = renderHook(() => useCancelClass({ refresh: mockRefresh }));

    await act(async () => {
      await result.current.cancel('res-001');
    });

    expect(mockShowError).toHaveBeenCalledWith('No se pudo cancelar');
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
