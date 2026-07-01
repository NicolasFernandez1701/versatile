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

vi.mock('@/core/components/GlobalAlertProvider', () => ({
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

  it('initializes with loading=true and empty state', () => {
    const { result } = renderHook(() => useStudentClassesData(baseWeekDates));

    expect(result.current.loading).toBe(true);
    expect(result.current.classesList).toEqual([]);
    expect(result.current.reservations).toEqual([]);
    expect(result.current.planLimits).toEqual({
      limit: 0,
      classesPerWeek: 0,
      perActivity: {},
    });
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

  it('does not fetch when user.id is null', async () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      current_studio_id: 'studio-001',
    });

    const { result } = renderHook(() => useStudentClassesData(baseWeekDates));

    expect(result.current.loading).toBe(true);
    expect(mockGetClasses).not.toHaveBeenCalled();
    expect(mockGetStudentAttendances).not.toHaveBeenCalled();
    expect(mockGetStudentClassLimit).not.toHaveBeenCalled();
  });

  it('does not fetch when weekDates is empty', async () => {
    const { result } = renderHook(() => useStudentClassesData({}));

    expect(result.current.loading).toBe(true);
    expect(mockGetClasses).not.toHaveBeenCalled();
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
});
