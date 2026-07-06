import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEnrollmentForm } from './useEnrollmentForm';
import type { UserProfile } from '@/core/types/users.types';
import type { ClassEntity } from '@/core/types/classes.types';

const mockGetStudents = vi.hoisted(() => vi.fn());
const mockGetClasses = vi.hoisted(() => vi.fn());
const mockEnrollStudent = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockOnSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  usersService: {
    getStudents: mockGetStudents,
  },
  classesService: {
    getClasses: mockGetClasses,
  },
  enrollmentsService: {
    enrollStudent: mockEnrollStudent,
  },
}));

vi.mock('@/ui/GlobalAlertProvider', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

const mockStudents: UserProfile[] = [
  { id: 'stu-001', full_name: 'María García', email: 'maria@test.com', role: 'student', created_at: '' },
  { id: 'stu-002', full_name: 'Juan Pérez', email: 'juan@test.com', role: 'student', created_at: '' },
];

const mockClasses: ClassEntity[] = [
  {
    id: 'cls-001',
    activity_name: 'Yoga',
    teacher_id: 'tea-001',
    day_of_week: 1,
    start_time: '10:00',
    end_time: '11:00',
    capacity: 15,
    base_price: 5000,
    teacher_commission_pct: 50,
    is_active: true,
  },
];

describe('useEnrollmentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStudents.mockResolvedValue(mockStudents);
    mockGetClasses.mockResolvedValue(mockClasses);
    mockEnrollStudent.mockResolvedValue(undefined);
  });

  it('initializes with empty selection', () => {
    const { result } = renderHook(() => useEnrollmentForm({ studioId: 'studio-001' }));

    expect(result.current.query).toBe('');
    expect(result.current.selectedStudent).toBe('');
    expect(result.current.selectedClass).toBe('');
    expect(result.current.studentDropdownOpen).toBe(false);
    expect(result.current.classDropdownOpen).toBe(false);
  });

  it('loads students and classes on mount', async () => {
    const { result } = renderHook(() => useEnrollmentForm({ studioId: 'studio-001' }));

    await waitFor(() => expect(result.current.results).toHaveLength(2));

    expect(mockGetStudents).toHaveBeenCalledWith('studio-001');
    expect(mockGetClasses).toHaveBeenCalledWith('studio-001');
    expect(result.current.results).toEqual(mockStudents);
    expect(result.current.classes).toEqual(mockClasses);
    expect(result.current.loading).toBe(false);
  });

  it('filters students via searchStudents', async () => {
    const { result } = renderHook(() => useEnrollmentForm({ studioId: 'studio-001' }));

    await waitFor(() => expect(result.current.results).toHaveLength(2));

    act(() => {
      result.current.searchStudents('Juan');
    });

    expect(result.current.query).toBe('Juan');
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe('stu-002');
    expect(result.current.studentDropdownOpen).toBe(true);
  });

  it('selects a student and closes dropdown', async () => {
    const { result } = renderHook(() => useEnrollmentForm({ studioId: 'studio-001' }));

    await waitFor(() => expect(result.current.results).toHaveLength(2));

    act(() => {
      result.current.selectStudent(mockStudents[0]);
    });

    expect(result.current.selectedStudent).toBe('stu-001');
    expect(result.current.query).toBe('María García');
    expect(result.current.studentDropdownOpen).toBe(false);
  });

  it('selects a class and closes dropdown', async () => {
    const { result } = renderHook(() => useEnrollmentForm({ studioId: 'studio-001' }));

    await waitFor(() => expect(result.current.results).toHaveLength(2));

    act(() => {
      result.current.selectClass(mockClasses[0]);
    });

    expect(result.current.selectedClass).toBe('cls-001');
    expect(result.current.classDropdownOpen).toBe(false);
  });

  it('submits enrollment when student and class are selected', async () => {
    const { result } = renderHook(() => useEnrollmentForm({ studioId: 'studio-001', onSuccess: mockOnSuccess }));

    await waitFor(() => expect(result.current.results).toHaveLength(2));

    act(() => {
      result.current.selectStudent(mockStudents[0]);
      result.current.selectClass(mockClasses[0]);
      result.current.setReservationDate('2026-07-15');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockEnrollStudent).toHaveBeenCalledWith('stu-001', 'cls-001', '2026-07-15');
    expect(mockShowSuccess).toHaveBeenCalledWith('Alumno inscripto correctamente.');
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('shows error when student is missing', async () => {
    const { result } = renderHook(() => useEnrollmentForm({ studioId: 'studio-001' }));

    await waitFor(() => expect(result.current.results).toHaveLength(2));

    act(() => {
      result.current.selectClass(mockClasses[0]);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockEnrollStudent).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalledWith('Por favor selecciona un alumno válido de la lista.');
  });

  it('shows error when class is missing', async () => {
    const { result } = renderHook(() => useEnrollmentForm({ studioId: 'studio-001' }));

    await waitFor(() => expect(result.current.results).toHaveLength(2));

    act(() => {
      result.current.selectStudent(mockStudents[0]);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockEnrollStudent).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalledWith('Por favor selecciona una clase válida de la lista.');
  });

  it('surfaces enrollment errors and stops loading', async () => {
    mockEnrollStudent.mockRejectedValueOnce(new Error('Capacidad máxima alcanzada'));
    const { result } = renderHook(() => useEnrollmentForm({ studioId: 'studio-001' }));

    await waitFor(() => expect(result.current.results).toHaveLength(2));

    act(() => {
      result.current.selectStudent(mockStudents[0]);
      result.current.selectClass(mockClasses[0]);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('Capacidad máxima alcanzada');
    expect(mockShowError).toHaveBeenCalledWith('Error: Capacidad máxima alcanzada');
    expect(result.current.loading).toBe(false);
  });
});
