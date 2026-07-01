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

vi.mock('@/core/components/GlobalAlertProvider', () => ({
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

describe('useEnrollments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-001' });
    mockGetEnrollments.mockResolvedValue([mockEnrollment]);
    mockGetClasses.mockResolvedValue([mockClass]);
    mockUnenrollStudent.mockResolvedValue(undefined);
  });

  it('initializes with empty state and loading=true', () => {
    const { result } = renderHook(() => useEnrollments());

    expect(result.current.enrollments).toEqual([]);
    expect(result.current.classesList).toEqual([]);
    expect(result.current.loading).toBe(true);
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

    await act(async () => {
      await result.current.deleteEnrollment('enr-001');
    });

    expect(mockUnenrollStudent).toHaveBeenCalledWith('enr-001');
    expect(mockGetEnrollments).toHaveBeenCalledTimes(2);
    expect(mockGetClasses).toHaveBeenCalledTimes(2);
    expect(mockShowSuccess).toHaveBeenCalledWith('Alumno desinscripto.');
  });

  it('loadData refreshes enrollments and classes', async () => {
    const { result } = renderHook(() => useEnrollments());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadData();
    });

    expect(mockGetEnrollments).toHaveBeenCalledTimes(2);
    expect(mockGetClasses).toHaveBeenCalledTimes(2);
  });

  it('shows error when fetch fails', async () => {
    mockGetEnrollments.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useEnrollments());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockShowError).toHaveBeenCalledWith('Error cargando las reservas.');
  });
});
