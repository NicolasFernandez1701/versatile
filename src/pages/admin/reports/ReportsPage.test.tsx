import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportsPage } from './ReportsPage';
import type { UseReportsDataResult } from '@/core/hooks/admin/useReportsData';
import type { AttendanceByStudent, AttendanceByClass } from '@/core/types/reports.types';

// The page must delegate all data access to the hook; the services layer is
// mocked only so any accidental direct call can be detected.
const mockUseReportsData = vi.hoisted(() => vi.fn());
const mockGetAttendanceByStudent = vi.hoisted(() => vi.fn());
const mockGetAttendanceByClass = vi.hoisted(() => vi.fn());
const mockGetRevenueByMonth = vi.hoisted(() => vi.fn());
const mockGetPopularClasses = vi.hoisted(() => vi.fn());
const mockGetTeacherCommissions = vi.hoisted(() => vi.fn());
const mockGetRetentionMetrics = vi.hoisted(() => vi.fn());

vi.mock('@/core/hooks/admin/useReportsData', () => ({
  useReportsData: mockUseReportsData,
}));

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

const STUDENT_ROW: AttendanceByStudent = {
  student_id: 's-1',
  full_name: 'Ana Pérez',
  attended: 8,
  absent: 2,
  cancelled: 0,
  total: 10,
};

const CLASS_ROW: AttendanceByClass = {
  class_id: 'c-1',
  activity_name: 'Yoga',
  day_of_week: 1,
  total_enrolled: 10,
  attended: 9,
  absent: 1,
  cancelled: 0,
  attendance_rate: 90,
};

function buildResult(overrides: Partial<UseReportsDataResult> = {}): UseReportsDataResult {
  return {
    attendanceByStudent: [],
    attendanceByClass: [],
    revenue: [],
    popular: [],
    commissions: [],
    retention: [],
    loading: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReportsData.mockReturnValue(buildResult());
  });

  it('shows the Loader while the hook reports loading', () => {
    mockUseReportsData.mockReturnValue(buildResult({ loading: true }));

    render(<ReportsPage />);

    expect(screen.getByText('Cargando reporte...')).toBeInTheDocument();
  });

  it('renders the active tab rows supplied by the hook once loading is false', () => {
    mockUseReportsData.mockReturnValue(buildResult({ attendanceByStudent: [STUDENT_ROW] }));

    render(<ReportsPage />);

    expect(screen.queryByText('Cargando reporte...')).not.toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('never touches the services layer itself', () => {
    render(<ReportsPage />);

    expect(mockGetAttendanceByStudent).not.toHaveBeenCalled();
    expect(mockGetAttendanceByClass).not.toHaveBeenCalled();
    expect(mockGetRevenueByMonth).not.toHaveBeenCalled();
    expect(mockGetPopularClasses).not.toHaveBeenCalled();
    expect(mockGetTeacherCommissions).not.toHaveBeenCalled();
    expect(mockGetRetentionMetrics).not.toHaveBeenCalled();
  });

  it('switching tabs calls the hook with the new tab and fetches nothing itself', () => {
    mockUseReportsData.mockReturnValue(buildResult({ attendanceByClass: [CLASS_ROW] }));

    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Asistencia / Clase' }));

    expect(mockUseReportsData).toHaveBeenLastCalledWith(
      'attendance-class',
      expect.objectContaining({ start: expect.any(String), end: expect.any(String) }),
    );
    expect(screen.getByText('Yoga')).toBeInTheDocument();
    expect(mockGetAttendanceByClass).not.toHaveBeenCalled();
  });
});
