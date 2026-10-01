import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminCalendarData } from './useAdminCalendarData';
import type { ClassEntity, EnrollmentEntity } from '@/core/types/classes.types';

const mockGetClasses = vi.hoisted(() => vi.fn());
const mockGetEnrolledStudents = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  classesService: {
    getClasses: mockGetClasses,
    getEnrolledStudents: mockGetEnrolledStudents,
  },
}));

const STUDIO_ID = 'studio-001';
const RESERVATION_DATE = '2026-07-10';

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

const mockEnrollment: EnrollmentEntity = {
  id: 'enr-001',
  class_id: 'class-001',
  student_id: 'student-001',
  reservation_date: RESERVATION_DATE,
  attendance_status: 'pending',
  profiles: { id: 'student-001', full_name: 'Juan Pérez', email: 'juan@test.com' },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

function flushSettles(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 20);
  });
}

describe('useAdminCalendarData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClasses.mockResolvedValue([mockClass]);
    mockGetEnrolledStudents.mockResolvedValue([mockEnrollment]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports loading=true before the gate settles, then exposes the fetched classes', async () => {
    const gate = deferred<ClassEntity[]>();
    mockGetClasses.mockReturnValueOnce(gate.promise);

    const { result } = renderHook(() => useAdminCalendarData(STUDIO_ID));

    expect(result.current.loading).toBe(true);
    expect(result.current.classes).toEqual([]);
    expect(result.current.viewingStudentsClass).toBeNull();
    expect(result.current.students).toEqual([]);
    expect(result.current.loadingStudents).toBe(false);

    await act(async () => {
      gate.resolve([mockClass]);
      await gate.promise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.classes).toEqual([mockClass]);
    expect(mockGetClasses).toHaveBeenCalledWith(STUDIO_ID);
  });

  it('treats a missing studio id as a resolved disabled gate (accepted AD-2 delta)', async () => {
    const { result } = renderHook(() => useAdminCalendarData(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.classes).toEqual([]);

    await flushSettles();

    expect(mockGetClasses).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('logs the raw error exactly once and settles with empty classes when the classes request fails', async () => {
    const error = new Error('Network error');
    mockGetClasses.mockRejectedValueOnce(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useAdminCalendarData(STUDIO_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(consoleSpy.mock.calls).toEqual([[error]]);
    expect(result.current.classes).toEqual([]);
  });

  it('refetch re-invokes the service exactly once, reports a blocking reload and is awaitable', async () => {
    const { result } = renderHook(() => useAdminCalendarData(STUDIO_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetClasses).toHaveBeenCalledTimes(1);

    const gate = deferred<ClassEntity[]>();
    mockGetClasses.mockReturnValueOnce(gate.promise);

    let refetchPromise!: Promise<void>;
    act(() => {
      refetchPromise = result.current.refetch();
    });

    expect(refetchPromise).toBeInstanceOf(Promise);
    expect(mockGetClasses).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      gate.resolve([mockClass]);
      await gate.promise;
    });
    await refetchPromise;

    expect(result.current.loading).toBe(false);
    expect(result.current.classes).toEqual([mockClass]);
  });

  it('openStudentsModal exposes the class immediately, toggles loadingStudents and stores the enrollments', async () => {
    const gate = deferred<EnrollmentEntity[]>();
    mockGetEnrolledStudents.mockReturnValueOnce(gate.promise);

    const { result } = renderHook(() => useAdminCalendarData(STUDIO_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let opening!: Promise<void>;
    act(() => {
      opening = result.current.openStudentsModal(mockClass, RESERVATION_DATE);
    });

    expect(result.current.viewingStudentsClass).toEqual(mockClass);
    expect(result.current.loadingStudents).toBe(true);
    expect(result.current.students).toEqual([]);
    expect(mockGetEnrolledStudents).toHaveBeenCalledWith('class-001', RESERVATION_DATE);

    await act(async () => {
      gate.resolve([mockEnrollment]);
      await gate.promise;
    });
    await opening;

    expect(result.current.loadingStudents).toBe(false);
    expect(result.current.students).toEqual([mockEnrollment]);
    expect(result.current.viewingStudentsClass).toEqual(mockClass);
  });

  it('openStudentsModal logs the page message and clears loadingStudents when the request fails', async () => {
    const error = new Error('Students network error');
    mockGetEnrolledStudents.mockRejectedValueOnce(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useAdminCalendarData(STUDIO_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.openStudentsModal(mockClass, RESERVATION_DATE);
    });

    expect(consoleSpy.mock.calls).toEqual([['Error fetching students:', error]]);
    expect(result.current.loadingStudents).toBe(false);
    expect(result.current.viewingStudentsClass).toEqual(mockClass);
    expect(result.current.students).toEqual([]);
  });

  it('closeStudentsModal clears only the viewed class, matching the page today', async () => {
    const { result } = renderHook(() => useAdminCalendarData(STUDIO_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.openStudentsModal(mockClass, RESERVATION_DATE);
    });

    expect(result.current.viewingStudentsClass).toEqual(mockClass);
    expect(result.current.students).toEqual([mockEnrollment]);

    act(() => {
      result.current.closeStudentsModal();
    });

    expect(result.current.viewingStudentsClass).toBeNull();
    expect(result.current.students).toEqual([mockEnrollment]);
  });

  it('keeps the returned callbacks stable across rerenders', async () => {
    const { result, rerender } = renderHook(() => useAdminCalendarData(STUDIO_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const firstRender = result.current;
    rerender();

    expect(result.current.refetch).toBe(firstRender.refetch);
    expect(result.current.openStudentsModal).toBe(firstRender.openStudentsModal);
    expect(result.current.closeStudentsModal).toBe(firstRender.closeStudentsModal);
  });
});
