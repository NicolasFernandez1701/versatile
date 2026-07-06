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

vi.mock('@/ui/GlobalAlertProvider', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

const todayStr = '2026-07-01';

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
});
