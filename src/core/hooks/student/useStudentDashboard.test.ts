import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStudentDashboard } from './useStudentDashboard';
import type { StudentDashboardData, StudentClassLimit } from '@/core/types/dashboard.types';

const mockGetStudentDashboardData = vi.hoisted(() => vi.fn());
const mockGetStudentClassLimit = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  dashboardService: {
    getStudentDashboardData: mockGetStudentDashboardData,
    getStudentClassLimit: mockGetStudentClassLimit,
  },
}));

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

const mockDashboardData: StudentDashboardData = {  activePlan: {
    plan_id: 'plan-001',
    plan_details: 'Plan Mensual',
    expiration_date: '2026-07-31',
  },
  nextClass: {
    reservation_date: '2026-07-02',
    classes: {
      activity_name: 'Yoga',
      start_time: '10:00',
      end_time: '11:00',
    },
  },
};

const mockClassLimit: StudentClassLimit = {
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
  },
};

describe('useStudentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStudentDashboardData.mockResolvedValue(mockDashboardData);
    mockGetStudentClassLimit.mockResolvedValue(mockClassLimit);
  });

  it('initializes with null data, null classLimit and loading=true', async () => {
    const { result } = renderHook(() => useStudentDashboard('student-001'));

    expect(result.current.data).toBeNull();
    expect(result.current.classLimit).toBeNull();
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('fetches dashboard data and class limit in parallel on mount', async () => {
    const { result } = renderHook(() => useStudentDashboard('student-001'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetStudentDashboardData).toHaveBeenCalledWith('student-001');
    expect(mockGetStudentClassLimit).toHaveBeenCalledWith('student-001');
    expect(result.current.data).toEqual(mockDashboardData);
    expect(result.current.classLimit).toEqual(mockClassLimit);
  });

  it('does not fetch when userId is missing', async () => {
    const { result } = renderHook(() => useStudentDashboard(undefined));

    expect(result.current.loading).toBe(false);
    expect(mockGetStudentDashboardData).not.toHaveBeenCalled();
    expect(mockGetStudentClassLimit).not.toHaveBeenCalled();
  });

  it('sets loading to false when fetch fails', async () => {
    mockGetStudentDashboardData.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useStudentDashboard('student-001'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.classLimit).toBeNull();
  });

  it('newest-wins: a stale userId response settling late never clobbers newer data', async () => {
    const dashboardGateA = deferred<StudentDashboardData>();
    const limitGateA = deferred<StudentClassLimit>();
    const dashboardGateB = deferred<StudentDashboardData>();
    const limitGateB = deferred<StudentClassLimit>();
    mockGetStudentDashboardData
      .mockImplementationOnce(() => dashboardGateA.promise)
      .mockImplementationOnce(() => dashboardGateB.promise);
    mockGetStudentClassLimit
      .mockImplementationOnce(() => limitGateA.promise)
      .mockImplementationOnce(() => limitGateB.promise);

    const dashboardB: StudentDashboardData = {
      activePlan: {
        plan_id: 'plan-B',
        plan_details: 'Plan B',
        expiration_date: '2026-08-31',
      },
      nextClass: null,
    };
    const limitB: StudentClassLimit = { ...mockClassLimit, limit: 7 };

    const { result, rerender } = renderHook(
      ({ userId }: { userId: string | undefined }) => useStudentDashboard(userId),
      { initialProps: { userId: 'student-A' as string | undefined } },
    );

    rerender({ userId: 'student-B' });

    dashboardGateB.resolve(dashboardB);
    limitGateB.resolve(limitB);
    await waitFor(() => expect(result.current.data?.activePlan?.plan_id).toBe('plan-B'));
    expect(result.current.classLimit?.limit).toBe(7);

    dashboardGateA.resolve(mockDashboardData);
    limitGateA.resolve(mockClassLimit);
    await flushSettles();

    expect(result.current.data?.activePlan?.plan_id).toBe('plan-B');
    expect(result.current.classLimit?.limit).toBe(7);
  });

  it('commits no state after unmount (no act warnings)', async () => {
    const dashboardGate = deferred<StudentDashboardData>();
    const limitGate = deferred<StudentClassLimit>();
    mockGetStudentDashboardData.mockImplementationOnce(() => dashboardGate.promise);
    mockGetStudentClassLimit.mockImplementationOnce(() => limitGate.promise);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderHook(() => useStudentDashboard('student-001'));
    unmount();

    dashboardGate.resolve(mockDashboardData);
    limitGate.resolve(mockClassLimit);
    await flushSettles();

    expect(actWarnings(consoleSpy)).toEqual([]);

    consoleSpy.mockRestore();
  });
});
