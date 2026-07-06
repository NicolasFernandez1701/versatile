import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useClassesManagement } from './useClassesManagement';
import type { ClassEntity } from '@/core/types/classes.types';
import type { EnrollmentEntity } from '@/core/types/classes.types';
import type { UserProfile } from '@/core/types/users.types';

const mockGetClasses = vi.hoisted(() => vi.fn());
const mockGetTeachers = vi.hoisted(() => vi.fn());
const mockCreateClass = vi.hoisted(() => vi.fn());
const mockUpdateClass = vi.hoisted(() => vi.fn());
const mockDeleteClass = vi.hoisted(() => vi.fn());
const mockGetEnrolledStudents = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  classesService: {
    getClasses: mockGetClasses,
    createClass: mockCreateClass,
    updateClass: mockUpdateClass,
    deleteClass: mockDeleteClass,
    getEnrolledStudents: mockGetEnrolledStudents,
  },
  usersService: {
    getTeachers: mockGetTeachers,
  },
}));

vi.mock('@/ui/GlobalAlertProvider', () => ({
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

const mockTeacher: UserProfile = {
  id: 'teacher-001',
  full_name: 'Ana García',
  email: 'ana@test.com',
  role: 'teacher',
  created_at: '2024-01-01',
};

const mockEnrollment: EnrollmentEntity = {
  id: 'enr-001',
  class_id: 'class-001',
  student_id: 'student-001',
  reservation_date: '2026-07-10',
  attendance_status: 'pending',
  profiles: { id: 'student-001', full_name: 'Juan Pérez', email: 'juan@test.com' },
};

describe('useClassesManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-001' });
    mockGetClasses.mockResolvedValue([mockClass]);
    mockGetTeachers.mockResolvedValue([mockTeacher]);
    mockCreateClass.mockResolvedValue(undefined);
    mockUpdateClass.mockResolvedValue(undefined);
    mockDeleteClass.mockResolvedValue(undefined);
    mockGetEnrolledStudents.mockResolvedValue([mockEnrollment]);
  });

  it('initializes with empty state and loading=true', async () => {
    const { result } = renderHook(() => useClassesManagement());

    expect(result.current.classes).toEqual([]);
    expect(result.current.teachers).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.viewingStudentsClass).toBeNull();
    expect(result.current.students).toEqual([]);
    expect(result.current.loadingStudents).toBe(false);

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('fetches classes and teachers on mount', async () => {
    const { result } = renderHook(() => useClassesManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetClasses).toHaveBeenCalledWith('studio-001');
    expect(mockGetTeachers).toHaveBeenCalledWith('studio-001');
    expect(result.current.classes).toEqual([mockClass]);
    expect(result.current.teachers).toEqual([mockTeacher]);
  });

  it('does not fetch when studio id is missing', async () => {
    mockUseAuthStore.mockReturnValue({ current_studio_id: null });

    const { result } = renderHook(() => useClassesManagement());

    expect(result.current.loading).toBe(false);
    expect(mockGetClasses).not.toHaveBeenCalled();
    expect(mockGetTeachers).not.toHaveBeenCalled();
  });

  it('createClass calls service and refreshes classes', async () => {
    const { result } = renderHook(() => useClassesManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const payload = { activity_name: 'Pilates' };
    await act(async () => {
      await result.current.createClass(payload);
    });

    expect(mockCreateClass).toHaveBeenCalledWith(payload);
    expect(mockGetClasses).toHaveBeenCalledTimes(2);
    expect(mockShowSuccess).toHaveBeenCalledWith('Clase creada con éxito.');
  });

  it('updateClass calls service and refreshes classes', async () => {
    const { result } = renderHook(() => useClassesManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const payload = { capacity: 20 };
    await act(async () => {
      await result.current.updateClass('class-001', payload);
    });

    expect(mockUpdateClass).toHaveBeenCalledWith('class-001', payload);
    expect(mockGetClasses).toHaveBeenCalledTimes(2);
    expect(mockShowSuccess).toHaveBeenCalledWith('Clase actualizada con éxito.');
  });

  it('deleteClass calls service and refreshes classes', async () => {
    const { result } = renderHook(() => useClassesManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteClass('class-001');
    });

    expect(mockDeleteClass).toHaveBeenCalledWith('class-001');
    expect(mockGetClasses).toHaveBeenCalledTimes(2);
    expect(mockShowSuccess).toHaveBeenCalledWith('Clase eliminada con éxito.');
  });

  it('toggleStatus updates class optimistically and calls service', async () => {
    const { result } = renderHook(() => useClassesManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleStatus('class-001', true);
    });

    expect(mockUpdateClass).toHaveBeenCalledWith('class-001', { is_active: false });
    expect(result.current.classes[0].is_active).toBe(false);
    expect(mockShowSuccess).toHaveBeenCalledWith('Estado actualizado con éxito.');
  });

  it('toggleStatus reverts optimistic update on error', async () => {
    mockUpdateClass.mockRejectedValueOnce(new Error('Update failed'));

    const { result } = renderHook(() => useClassesManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleStatus('class-001', true);
    });

    expect(mockUpdateClass).toHaveBeenCalledWith('class-001', { is_active: false });
    expect(result.current.classes[0].is_active).toBe(true);
    expect(mockShowError).toHaveBeenCalledWith('Error actualizando el estado.');
  });

  it('openStudentsModal fetches enrolled students', async () => {
    const { result } = renderHook(() => useClassesManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.openStudentsModal(mockClass);
    });

    await waitFor(() => expect(result.current.loadingStudents).toBe(false));

    expect(result.current.viewingStudentsClass).toEqual(mockClass);
    expect(mockGetEnrolledStudents).toHaveBeenCalledWith('class-001');
    expect(result.current.students).toEqual([mockEnrollment]);
  });

  it('shows error when fetch fails', async () => {
    mockGetClasses.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useClassesManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockShowError).toHaveBeenCalledWith('Error cargando las clases.');
  });
});
