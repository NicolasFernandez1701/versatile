import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStudentClassesData } from './useStudentClassesData';
import type { ClassEntity } from '@/core/types/classes.types';
import type { AttendanceRecord } from '@/core/types/attendance.types';
import type { StudentClassLimit } from '@/core/types/dashboard.types';

const mockGetClasses = vi.hoisted(() => vi.fn());
const mockGetStudentAttendances = vi.hoisted(() => vi.fn());
const mockGetStudentClassLimit = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  classesService: {
    getClasses: mockGetClasses,
  },
  attendanceService: {
    getStudentAttendances: mockGetStudentAttendances,
  },
  dashboardService: {
    getStudentClassLimit: mockGetStudentClassLimit,
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

const mockClass: ClassEntity = {
  id: 'class-001',
  activity_name: 'Yoga',
  teacher_id: 'teacher-001',
  day_of_week: 1,
  start_time: '10:00',
  end_time: '11:00',
  capacity: 15,
  base_price: 5000,
  teacher_commission_pct: 50,
  is_active: true,
};

const mockInactiveClass: ClassEntity = {
  ...mockClass,
  id: 'class-002',
  activity_name: 'Pilates',
  is_active: false,
};

const mockReservation: AttendanceRecord = {
  id: 'res-001',
  enrollment_id: 'res-001',
  date: '2026-07-01',
  status: 'confirmed',
};

const mockPlanLimits: StudentClassLimit = {
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

const baseWeekDates: Record<number, Date> = {
  0: new Date('2026-07-05'),
  1: new Date('2026-07-06'),
  2: new Date('2026-07-07'),
  3: new Date('2026-07-08'),
  4: new Date('2026-07-09'),
  5: new Date('2026-07-10'),
  6: new Date('2026-07-11'),
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

describe('useStudentClassesData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: { id: 'student-001' },
      current_studio_id: 'studio-001',
    });
    mockGetClasses.mockResolvedValue([mockClass, mockInactiveClass]);
    mockGetStudentAttendances.mockResolvedValue([mockReservation]);
    mockGetStudentClassLimit.mockResolvedValue(mockPlanLimits);
  });

  it('initializes with loading=true and empty state', async () => {
    const { result } = renderHook(() => useStudentClassesData(baseWeekDates));

    expect(result.current.loading).toBe(true);
    expect(result.current.classesList).toEqual([]);
    expect(result.current.reservations).toEqual([]);
    expect(result.current.planLimits).toEqual({
      limit: 0,
      classesPerWeek: 0,
      perActivity: {},
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('fetches classes, reservations, and limits in parallel', async () => {
    const { result } = renderHook(() => useStudentClassesData(baseWeekDates));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetClasses).toHaveBeenCalledWith('studio-001');
    expect(mockGetStudentAttendances).toHaveBeenCalledWith('student-001');
    expect(mockGetStudentClassLimit).toHaveBeenCalledWith('student-001');
    expect(result.current.classesList).toEqual([mockClass]);
    expect(result.current.reservations).toEqual([mockReservation]);
    expect(result.current.planLimits).toEqual(mockPlanLimits);
  });

  it('filters out inactive classes', async () => {
    const { result } = renderHook(() => useStudentClassesData(baseWeekDates));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.classesList).toHaveLength(1);
    expect(result.current.classesList[0].id).toBe('class-001');
    expect(result.current.classesList[0].is_active).toBe(true);
  });

  it('handles service error gracefully', async () => {
    mockGetClasses.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useStudentClassesData(baseWeekDates));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockShowError).toHaveBeenCalledWith('Error cargando los datos: Network error');
    expect(result.current.classesList).toEqual([]);
  });

  it('reports loading=false while disabled by a null user (G-Q1: never a stuck spinner)', async () => {
    // Spec Disabled-gate scenario (async-resource-primitive): a disabled gate
    // performs no work and reports loading:false. User-authorized 2026-09-29
    // (G-Q1): the previous loading:true observable encoded a spinner that
    // never stopped, so this asserts the fixed behavior, not the old one.
    mockUseAuthStore.mockReturnValue({
      user: null,
      current_studio_id: 'studio-001',
    });

    const { result } = renderHook(() => useStudentClassesData(baseWeekDates));

    expect(result.current.loading).toBe(false);
    await flushSettles();
    expect(result.current.loading).toBe(false);
    expect(mockGetClasses).not.toHaveBeenCalled();
    expect(mockGetStudentAttendances).not.toHaveBeenCalled();
    expect(mockGetStudentClassLimit).not.toHaveBeenCalled();
  });

  it('reports loading=false while disabled by empty weekDates (G-Q1: never a stuck spinner)', async () => {
    // Same G-Q1 guarantee for the other gate: empty weekDates disables the
    // fetch, so no loader may be shown while nothing is being fetched.
    const { result } = renderHook(() => useStudentClassesData({}));

    expect(result.current.loading).toBe(false);
    await flushSettles();
    expect(result.current.loading).toBe(false);
    expect(mockGetClasses).not.toHaveBeenCalled();
  });

  it('never leaves a disabled gate stuck at loading=true (stuck-spinner regression pin)', async () => {
    // Both gates disabled at once. Fails if the pre-G-Q1 stuck-true behavior
    // ever returns: no fetch may fire and no loader may be shown, even after
    // effects have flushed.
    mockUseAuthStore.mockReturnValue({
      user: null,
      current_studio_id: 'studio-001',
    });

    const { result } = renderHook(() => useStudentClassesData({}));

    await flushSettles();
    expect(mockGetClasses).not.toHaveBeenCalled();
    expect(mockGetStudentAttendances).not.toHaveBeenCalled();
    expect(mockGetStudentClassLimit).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('respects weekDates dependency', async () => {
    const { result, rerender } = renderHook(
      ({ weekDates }: { weekDates: Record<number, Date> }) => useStudentClassesData(weekDates),
      { initialProps: { weekDates: baseWeekDates } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetClasses).toHaveBeenCalledTimes(1);

    const newWeekDates: Record<number, Date> = {
      0: new Date('2026-07-12'),
    };

    rerender({ weekDates: newWeekDates });

    await waitFor(() => expect(mockGetClasses).toHaveBeenCalledTimes(2));
  });

  it('does not refetch when weekDates identity changes but content is unchanged', async () => {
    // The fetch key is derived from weekDates content, so a new object with
    // identical days must not trigger a second fetch (kills the refetch loop).
    const { result, rerender } = renderHook(
      ({ weekDates }: { weekDates: Record<number, Date> }) => useStudentClassesData(weekDates),
      { initialProps: { weekDates: baseWeekDates } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetClasses).toHaveBeenCalledTimes(1);

    rerender({ weekDates: { ...baseWeekDates } });
    await flushSettles();

    expect(mockGetClasses).toHaveBeenCalledTimes(1);
  });

  it('newest-wins: a stale week-A response settling late never clobbers newer week-B data', async () => {
    const classesGateA = deferred<ClassEntity[]>();
    const attendancesGateA = deferred<AttendanceRecord[]>();
    const limitsGateA = deferred<StudentClassLimit>();
    const classesGateB = deferred<ClassEntity[]>();
    const attendancesGateB = deferred<AttendanceRecord[]>();
    const limitsGateB = deferred<StudentClassLimit>();
    mockGetClasses
      .mockImplementationOnce(() => classesGateA.promise)
      .mockImplementationOnce(() => classesGateB.promise);
    mockGetStudentAttendances
      .mockImplementationOnce(() => attendancesGateA.promise)
      .mockImplementationOnce(() => attendancesGateB.promise);
    mockGetStudentClassLimit
      .mockImplementationOnce(() => limitsGateA.promise)
      .mockImplementationOnce(() => limitsGateB.promise);

    const weekB: Record<number, Date> = {
      0: new Date('2026-07-12'),
    };
    const { result, rerender } = renderHook(
      ({ weekDates }: { weekDates: Record<number, Date> }) => useStudentClassesData(weekDates),
      { initialProps: { weekDates: baseWeekDates } },
    );

    rerender({ weekDates: weekB });

    const classB: ClassEntity = { ...mockClass, id: 'class-009', activity_name: 'Boxeo' };
    classesGateB.resolve([classB, mockInactiveClass]);
    attendancesGateB.resolve([]);
    limitsGateB.resolve(mockPlanLimits);
    await waitFor(() => expect(result.current.classesList).toEqual([classB]));
    expect(result.current.reservations).toEqual([]);

    classesGateA.resolve([mockClass, mockInactiveClass]);
    attendancesGateA.resolve([mockReservation]);
    limitsGateA.resolve(mockPlanLimits);
    await flushSettles();

    expect(result.current.classesList).toEqual([classB]);
    expect(result.current.reservations).toEqual([]);
  });

  it('commits no state after unmount (no act warnings)', async () => {
    const classesGate = deferred<ClassEntity[]>();
    const attendancesGate = deferred<AttendanceRecord[]>();
    const limitsGate = deferred<StudentClassLimit>();
    mockGetClasses.mockImplementationOnce(() => classesGate.promise);
    mockGetStudentAttendances.mockImplementationOnce(() => attendancesGate.promise);
    mockGetStudentClassLimit.mockImplementationOnce(() => limitsGate.promise);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderHook(() => useStudentClassesData(baseWeekDates));
    unmount();

    classesGate.resolve([mockClass]);
    attendancesGate.resolve([mockReservation]);
    limitsGate.resolve(mockPlanLimits);
    await flushSettles();

    expect(actWarnings(consoleSpy)).toEqual([]);

    consoleSpy.mockRestore();
  });
});
