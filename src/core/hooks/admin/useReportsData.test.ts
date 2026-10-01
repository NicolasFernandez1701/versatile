import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReportsData } from './useReportsData';
import type { ReportTab } from '@/core/types/reports.types';
import type {
  AttendanceByStudent,
  AttendanceByClass,
  RevenueByMonth,
  PopularClass,
  TeacherCommission,
  RetentionMetric,
} from '@/core/types/reports.types';

const mockGetAttendanceByStudent = vi.hoisted(() => vi.fn());
const mockGetAttendanceByClass = vi.hoisted(() => vi.fn());
const mockGetRevenueByMonth = vi.hoisted(() => vi.fn());
const mockGetPopularClasses = vi.hoisted(() => vi.fn());
const mockGetTeacherCommissions = vi.hoisted(() => vi.fn());
const mockGetRetentionMetrics = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  reportsService: {
    getAttendanceByStudent: mockGetAttendanceByStudent,
    getAttendanceByClass: mockGetAttendanceByClass,
    getRevenueByMonth: mockGetRevenueByMonth,
    getPopularClasses: mockGetPopularClasses,
    getTeacherCommissions: mockGetTeacherCommissions,
    getRetentionMetrics: mockGetRetentionMetrics,
  },
}));

const DATE_RANGE = { start: '2026-07-01', end: '2026-07-31' };

const mockAttendanceByStudent: AttendanceByStudent = {
  student_id: 'student-001',
  full_name: 'Ana',
  attended: 3,
  absent: 1,
  cancelled: 0,
  total: 4,
};

const mockAttendanceByClass: AttendanceByClass = {
  class_id: 'class-001',
  activity_name: 'Yoga',
  day_of_week: 1,
  total_enrolled: 10,
  attended: 8,
  absent: 1,
  cancelled: 1,
  attendance_rate: 80,
};

const mockRevenue: RevenueByMonth = { month: '2026-07', total: 15000 };
const mockPopularClass: PopularClass = { activity_name: 'Pilates', enrollment_count: 12 };
const mockCommission: TeacherCommission = {
  teacher_id: 'teacher-001',
  full_name: 'Luis',
  total_earned: 9000,
  class_count: 6,
};
const mockRetention: RetentionMetric = {
  student_id: 'student-002',
  full_name: 'Beto',
  last_attendance: '2026-06-30',
  days_since_last: 35,
};

type HookProps = { activeTab: ReportTab; dateRange: { start: string; end: string } };

function renderReportsHook(initialProps: HookProps) {
  return renderHook((props: HookProps) => useReportsData(props.activeTab, props.dateRange), {
    initialProps,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

describe('useReportsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAttendanceByStudent.mockResolvedValue([mockAttendanceByStudent]);
    mockGetAttendanceByClass.mockResolvedValue([mockAttendanceByClass]);
    mockGetRevenueByMonth.mockResolvedValue([mockRevenue]);
    mockGetPopularClasses.mockResolvedValue([mockPopularClass]);
    mockGetTeacherCommissions.mockResolvedValue([mockCommission]);
    mockGetRetentionMetrics.mockResolvedValue([mockRetention]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports loading=true while the request is in flight, then exposes the active tab rows', async () => {
    const gate = deferred<AttendanceByStudent[]>();
    mockGetAttendanceByStudent.mockReturnValueOnce(gate.promise);

    const { result } = renderReportsHook({
      activeTab: 'attendance-student',
      dateRange: DATE_RANGE,
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.attendanceByStudent).toEqual([]);

    await act(async () => {
      gate.resolve([mockAttendanceByStudent]);
      await gate.promise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.attendanceByStudent).toEqual([mockAttendanceByStudent]);
    expect(mockGetAttendanceByStudent).toHaveBeenCalledWith(DATE_RANGE.start, DATE_RANGE.end);
  });

  it('exposes only the loaded tab rows and keeps the other five arrays empty', async () => {
    const { result } = renderReportsHook({ activeTab: 'commissions', dateRange: DATE_RANGE });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetTeacherCommissions).toHaveBeenCalledTimes(1);
    expect(result.current.commissions).toEqual([mockCommission]);
    expect(result.current.attendanceByStudent).toEqual([]);
    expect(result.current.attendanceByClass).toEqual([]);
    expect(result.current.revenue).toEqual([]);
    expect(result.current.popular).toEqual([]);
    expect(result.current.retention).toEqual([]);
  });

  it('switching tabs invokes exactly the matching service and routes rows into its own array', async () => {
    const { result, rerender } = renderReportsHook({
      activeTab: 'attendance-student',
      dateRange: DATE_RANGE,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetAttendanceByStudent).toHaveBeenCalledTimes(1);
    expect(mockGetAttendanceByStudent).toHaveBeenCalledWith(DATE_RANGE.start, DATE_RANGE.end);
    expect(result.current.attendanceByStudent).toEqual([mockAttendanceByStudent]);

    rerender({ activeTab: 'attendance-class', dateRange: DATE_RANGE });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetAttendanceByClass).toHaveBeenCalledTimes(1);
    expect(mockGetAttendanceByClass).toHaveBeenCalledWith(DATE_RANGE.start, DATE_RANGE.end);
    expect(result.current.attendanceByClass).toEqual([mockAttendanceByClass]);
    expect(result.current.attendanceByStudent).toEqual([]);

    rerender({ activeTab: 'revenue', dateRange: DATE_RANGE });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetRevenueByMonth).toHaveBeenCalledTimes(1);
    expect(mockGetRevenueByMonth).toHaveBeenCalledWith(12);
    expect(result.current.revenue).toEqual([mockRevenue]);

    rerender({ activeTab: 'popular', dateRange: DATE_RANGE });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetPopularClasses).toHaveBeenCalledTimes(1);
    expect(mockGetPopularClasses).toHaveBeenCalledWith();
    expect(result.current.popular).toEqual([mockPopularClass]);

    rerender({ activeTab: 'retention', dateRange: DATE_RANGE });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetRetentionMetrics).toHaveBeenCalledTimes(1);
    expect(mockGetRetentionMetrics).toHaveBeenCalledWith();
    expect(result.current.retention).toEqual([mockRetention]);
  });

  it('discards a superseded tab run instead of letting it repopulate a non-matching array', async () => {
    const studentGate = deferred<AttendanceByStudent[]>();
    const classGate = deferred<AttendanceByClass[]>();
    mockGetAttendanceByStudent.mockReturnValueOnce(studentGate.promise);
    mockGetAttendanceByClass.mockReturnValueOnce(classGate.promise);

    const { result, rerender } = renderReportsHook({
      activeTab: 'attendance-student',
      dateRange: DATE_RANGE,
    });

    // Switch tabs while the student request is still in flight.
    rerender({ activeTab: 'attendance-class', dateRange: DATE_RANGE });

    await act(async () => {
      classGate.resolve([mockAttendanceByClass]);
      await classGate.promise;
    });

    expect(result.current.attendanceByClass).toEqual([mockAttendanceByClass]);

    // Settle the superseded student request late: it must be ignored.
    await act(async () => {
      studentGate.resolve([mockAttendanceByStudent]);
      await studentGate.promise;
    });

    expect(result.current.attendanceByClass).toEqual([mockAttendanceByClass]);
    expect(result.current.attendanceByStudent).toEqual([]);
  });

  it('refetches when the date range changes', async () => {
    const { result, rerender } = renderReportsHook({
      activeTab: 'attendance-student',
      dateRange: DATE_RANGE,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetAttendanceByStudent).toHaveBeenCalledTimes(1);
    expect(mockGetAttendanceByStudent).toHaveBeenLastCalledWith(DATE_RANGE.start, DATE_RANGE.end);

    rerender({
      activeTab: 'attendance-student',
      dateRange: { start: '2026-08-01', end: '2026-08-31' },
    });

    await waitFor(() => expect(mockGetAttendanceByStudent).toHaveBeenCalledTimes(2));
    expect(mockGetAttendanceByStudent).toHaveBeenLastCalledWith('2026-08-01', '2026-08-31');
  });

  it('logs "Error loading report:" with the error, ends loading and leaves every array empty', async () => {
    const error = new Error('Report failure');
    mockGetAttendanceByStudent.mockRejectedValueOnce(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderReportsHook({
      activeTab: 'attendance-student',
      dateRange: DATE_RANGE,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(consoleSpy.mock.calls).toEqual([['Error loading report:', error]]);
    expect(result.current.attendanceByStudent).toEqual([]);
    expect(result.current.attendanceByClass).toEqual([]);
    expect(result.current.revenue).toEqual([]);
    expect(result.current.popular).toEqual([]);
    expect(result.current.commissions).toEqual([]);
    expect(result.current.retention).toEqual([]);
  });

  it('refetch is awaitable, re-invokes the service exactly once and never rejects', async () => {
    const { result } = renderReportsHook({
      activeTab: 'attendance-student',
      dateRange: DATE_RANGE,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetAttendanceByStudent).toHaveBeenCalledTimes(1);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('refetch failure');
    mockGetAttendanceByStudent.mockRejectedValueOnce(error);

    let refetchPromise!: Promise<void>;
    act(() => {
      refetchPromise = result.current.refetch();
    });

    expect(refetchPromise).toBeInstanceOf(Promise);
    expect(mockGetAttendanceByStudent).toHaveBeenCalledTimes(2);

    await expect(refetchPromise).resolves.toBeUndefined();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(consoleSpy).toHaveBeenCalledWith('Error loading report:', error);
    expect(mockGetAttendanceByStudent).toHaveBeenCalledTimes(2);
  });
});
