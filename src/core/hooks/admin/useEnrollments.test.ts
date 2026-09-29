import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEnrollments } from './useEnrollments';
import type { EnrollmentEntity } from '@/core/types/enrollments.types';
import type { ClassEntity } from '@/core/types/classes.types';

const mockGetEnrollments = vi.hoisted(() => vi.fn());
const mockGetClasses = vi.hoisted(() => vi.fn());
const mockUnenrollStudent = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  enrollmentsService: {
    getEnrollments: mockGetEnrollments,
    unenrollStudent: mockUnenrollStudent,
  },
  classesService: {
    getClasses: mockGetClasses,
  },
}));

vi.mock('@/ui/useAlert', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
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

const mockEnrollment: EnrollmentEntity = {
  id: 'enr-001',
  student_id: 'student-001',
  class_id: 'class-001',
  reservation_date: '2026-07-10',
  attendance_status: 'pending',
  created_at: '2026-07-01',
  profiles: { full_name: 'Juan Pérez', email: 'juan@test.com' },
  classes: { activity_name: 'Yoga', day_of_week: 1, start_time: '10:00' },
};

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

const mockEnrollmentB: EnrollmentEntity = {
  ...mockEnrollment,
  id: 'enr-002',
};

const mockClassB: ClassEntity = {
  ...mockClass,
  id: 'class-002',
  activity_name: 'Pilates',
};

describe('useEnrollments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-001' });
    mockGetEnrollments.mockResolvedValue([mockEnrollment]);
    mockGetClasses.mockResolvedValue([mockClass]);
    mockUnenrollStudent.mockResolvedValue(undefined);
  });

  it('initializes with empty state and loading=true', async () => {
    const { result } = renderHook(() => useEnrollments());

    expect(result.current.enrollments).toEqual([]);
    expect(result.current.classesList).toEqual([]);
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('fetches enrollments and classes in parallel on mount', async () => {
    const { result } = renderHook(() => useEnrollments());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetEnrollments).toHaveBeenCalled();
    expect(mockGetClasses).toHaveBeenCalledWith('studio-001');
    expect(result.current.enrollments).toEqual([mockEnrollment]);
    expect(result.current.classesList).toEqual([mockClass]);
  });

  it('does not fetch when studio id is missing', async () => {
    mockUseAuthStore.mockReturnValue({ current_studio_id: null });

    const { result } = renderHook(() => useEnrollments());

    expect(result.current.loading).toBe(false);
    expect(mockGetEnrollments).not.toHaveBeenCalled();
    expect(mockGetClasses).not.toHaveBeenCalled();
  });

  it('deleteEnrollment calls service and reloads data', async () => {
    const { result } = renderHook(() => useEnrollments());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let refresh!: Promise<void>;
    await act(async () => {
      refresh = result.current.deleteEnrollment('enr-001');
    });
    await act(async () => {});
    await refresh;

    expect(mockUnenrollStudent).toHaveBeenCalledWith('enr-001');
    expect(mockGetEnrollments).toHaveBeenCalledTimes(2);
    expect(mockGetClasses).toHaveBeenCalledTimes(2);
    expect(mockShowSuccess).toHaveBeenCalledWith('Alumno desinscripto.');
  });

  it('loadData refreshes enrollments and classes', async () => {
    const { result } = renderHook(() => useEnrollments());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let refresh!: Promise<void>;
    await act(async () => {
      refresh = result.current.loadData();
    });
    await act(async () => {});
    await refresh;

    expect(mockGetEnrollments).toHaveBeenCalledTimes(2);
    expect(mockGetClasses).toHaveBeenCalledTimes(2);
  });

  it('shows error when fetch fails', async () => {
    mockGetEnrollments.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useEnrollments());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockShowError).toHaveBeenCalledWith('Error cargando las reservas.');
  });

  it('newest-wins: a stale studio-A response settling late never clobbers newer studio-B data', async () => {
    const enrollmentsGateA = deferred<EnrollmentEntity[]>();
    const classesGateA = deferred<ClassEntity[]>();
    const enrollmentsGateB = deferred<EnrollmentEntity[]>();
    const classesGateB = deferred<ClassEntity[]>();
    mockGetEnrollments
      .mockImplementationOnce(() => enrollmentsGateA.promise)
      .mockImplementationOnce(() => enrollmentsGateB.promise);
    mockGetClasses
      .mockImplementationOnce(() => classesGateA.promise)
      .mockImplementationOnce(() => classesGateB.promise);

    const { result, rerender } = renderHook(() => useEnrollments());

    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-B' });
    rerender();

    enrollmentsGateB.resolve([mockEnrollmentB]);
    classesGateB.resolve([mockClassB]);
    await waitFor(() => expect(result.current.enrollments).toEqual([mockEnrollmentB]));
    expect(result.current.classesList).toEqual([mockClassB]);

    enrollmentsGateA.resolve([mockEnrollment]);
    classesGateA.resolve([mockClass]);
    await flushSettles();

    expect(result.current.enrollments).toEqual([mockEnrollmentB]);
    expect(result.current.classesList).toEqual([mockClassB]);
  });

  it('commits no state after unmount (no act warnings)', async () => {
    const enrollmentsGate = deferred<EnrollmentEntity[]>();
    const classesGate = deferred<ClassEntity[]>();
    mockGetEnrollments.mockImplementationOnce(() => enrollmentsGate.promise);
    mockGetClasses.mockImplementationOnce(() => classesGate.promise);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderHook(() => useEnrollments());
    unmount();

    enrollmentsGate.resolve([mockEnrollment]);
    classesGate.resolve([mockClass]);
    await flushSettles();

    expect(actWarnings(consoleSpy)).toEqual([]);

    consoleSpy.mockRestore();
  });
});
