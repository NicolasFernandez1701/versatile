import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useClassAttendance } from './useClassAttendance';
import type { ClassEntity } from '@/core/types/classes.types';
import type { AttendanceRecord } from '@/core/types/attendance.types';
import type { EnrollmentEntity } from '@/core/types/enrollments.types';

const mockGetClassEnrollments = vi.hoisted(() => vi.fn());
const mockGetClassAttendanceByDate = vi.hoisted(() => vi.fn());
const mockMarkAttendance = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  attendanceService: {
    getClassEnrollments: mockGetClassEnrollments,
    getClassAttendanceByDate: mockGetClassAttendanceByDate,
    markAttendance: mockMarkAttendance,
  },
}));

vi.mock('@/ui/useAlert', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

const todayStr = '2026-07-01';

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

function makeRecord(id: string, classId: string): AttendanceRecord {
  return {
    id,
    enrollment_id: id,
    date: todayStr,
    status: 'confirmed',
    enrollments: {
      student_id: 'stu-001',
      class_id: classId,
    },
  };
}

function makeClass(id: string): ClassEntity {
  return {
    id,
    activity_name: 'Yoga',
    teacher_id: 'teacher-001',
    day_of_week: 1,
    start_time: '10:00:00',
    end_time: '11:00:00',
    capacity: 20,
    base_price: 10000,
    teacher_commission_pct: 30,
    is_active: true,
  };
}

describe('useClassAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassEnrollments.mockResolvedValue([]);
    mockGetClassAttendanceByDate.mockResolvedValue([]);
    mockMarkAttendance.mockResolvedValue(undefined);
  });

  it('loads enrollments when activeTab is padron', async () => {
    const enrollments: EnrollmentEntity[] = [
      {
        id: 'enr-001',
        student_id: 'stu-001',
        class_id: 'cls-001',
        reservation_date: todayStr,
        attendance_status: 'pending',
        created_at: todayStr,
      },
    ];
    mockGetClassEnrollments.mockResolvedValue(enrollments);

    const { result } = renderHook(() =>
      useClassAttendance({ selectedClass: makeClass('cls-001'), activeTab: 'padron', todayStr }),
    );

    await waitFor(() => expect(result.current.loadingDetails).toBe(false));

    expect(mockGetClassEnrollments).toHaveBeenCalledWith('cls-001');
    expect(result.current.enrollments).toEqual(enrollments);
  });

  it('performs optimistic attendance toggle and calls service', async () => {
    const attendanceRecords: AttendanceRecord[] = [
      {
        id: 'enr-001',
        enrollment_id: 'enr-001',
        date: todayStr,
        status: 'confirmed',
        enrollments: {
          student_id: 'stu-001',
          class_id: 'cls-001',
        },
      },
    ];
    mockGetClassAttendanceByDate.mockResolvedValue(attendanceRecords);

    const { result } = renderHook(() =>
      useClassAttendance({ selectedClass: makeClass('cls-001'), activeTab: 'asistencia', todayStr }),
    );

    await waitFor(() => expect(result.current.loadingDetails).toBe(false));

    let togglePromise: Promise<void>;
    act(() => {
      togglePromise = result.current.handleToggleAttendance(attendanceRecords[0], 'present');
    });
    await togglePromise!;

    expect(mockMarkAttendance).toHaveBeenCalledWith('enr-001', todayStr, 'present');
    expect(mockShowSuccess).toHaveBeenCalledWith('Asistencia marcada como Presente');
  });

  it('reverts optimistic update and shows error when markAttendance fails', async () => {
    const attendanceRecords: AttendanceRecord[] = [
      {
        id: 'enr-001',
        enrollment_id: 'enr-001',
        date: todayStr,
        status: 'confirmed',
        enrollments: {
          student_id: 'stu-001',
          class_id: 'cls-001',
        },
      },
    ];
    mockGetClassAttendanceByDate.mockResolvedValue(attendanceRecords);
    mockMarkAttendance.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useClassAttendance({ selectedClass: makeClass('cls-001'), activeTab: 'asistencia', todayStr }),
    );

    await waitFor(() => expect(result.current.loadingDetails).toBe(false));

    const initialCalls = mockGetClassAttendanceByDate.mock.calls.length;

    await act(async () => {
      await result.current.handleToggleAttendance(attendanceRecords[0], 'present');
    });

    await waitFor(() => {
      expect(mockGetClassAttendanceByDate.mock.calls.length).toBeGreaterThan(initialCalls);
    });

    expect(mockShowError).toHaveBeenCalledWith('Error al marcar asistencia: Network error');
  });

  it('fetches the newly-selected tab without re-fetching the other resource', async () => {
    // Parity: only the active tab fetches. Switching tabs enables the other
    // resource exactly once and leaves the idle one untouched. The class
    // object is hoisted so tab identity — not object identity — drives the
    // fetch.
    mockGetClassEnrollments.mockResolvedValue([
      {
        id: 'enr-001',
        student_id: 'stu-001',
        class_id: 'cls-001',
        reservation_date: todayStr,
        attendance_status: 'pending',
        created_at: todayStr,
      },
    ]);
    const stableClass = makeClass('cls-001');

    const { result, rerender } = renderHook(
      ({ activeTab }: { activeTab: 'asistencia' | 'padron' }) =>
        useClassAttendance({ selectedClass: stableClass, activeTab, todayStr }),
      { initialProps: { activeTab: 'padron' as 'asistencia' | 'padron' } },
    );

    await waitFor(() => expect(result.current.loadingDetails).toBe(false));
    expect(mockGetClassEnrollments).toHaveBeenCalledTimes(1);
    expect(mockGetClassAttendanceByDate).not.toHaveBeenCalled();

    rerender({ activeTab: 'asistencia' as const });

    await waitFor(() => expect(mockGetClassAttendanceByDate).toHaveBeenCalledTimes(1));
    expect(mockGetClassEnrollments).toHaveBeenCalledTimes(1);
  });

  it('newest-wins: a stale class-A response settling late never clobbers newer class-B data', async () => {
    const gateA = deferred<AttendanceRecord[]>();
    const gateB = deferred<AttendanceRecord[]>();
    mockGetClassAttendanceByDate
      .mockImplementationOnce(() => gateA.promise)
      .mockImplementationOnce(() => gateB.promise);

    const recordsA = [makeRecord('enr-A', 'cls-001')];
    const recordsB = [makeRecord('enr-B', 'cls-002')];
    const classA = makeClass('cls-001');
    const classB = makeClass('cls-002');
    const { result, rerender } = renderHook(
      ({ selectedClass }: { selectedClass: ReturnType<typeof makeClass> }) =>
        useClassAttendance({ selectedClass, activeTab: 'asistencia', todayStr }),
      { initialProps: { selectedClass: classA } },
    );

    rerender({ selectedClass: classB });

    gateB.resolve(recordsB);
    await waitFor(() => expect(result.current.attendances).toEqual(recordsB));

    gateA.resolve(recordsA);
    await flushSettles();

    expect(result.current.attendances).toEqual(recordsB);
    expect(mockGetClassAttendanceByDate).toHaveBeenCalledTimes(2);
  });

  it('commits no state after unmount (no act warnings)', async () => {
    const gate = deferred<AttendanceRecord[]>();
    mockGetClassAttendanceByDate.mockImplementationOnce(() => gate.promise);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderHook(() =>
      useClassAttendance({ selectedClass: makeClass('cls-001'), activeTab: 'asistencia', todayStr }),
    );
    unmount();

    gate.resolve([makeRecord('enr-001', 'cls-001')]);
    await flushSettles();

    expect(actWarnings(consoleSpy)).toEqual([]);

    consoleSpy.mockRestore();
  });
});
