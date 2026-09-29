import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportsService } from './reports.service';

// ──────────────────────────────────────────────
// 1. Test data helpers (local-date safe: reservation_date is a SQL DATE)
// ──────────────────────────────────────────────

const STUDIO_ID = 'studio-001';

function toLocalKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDays(base: Date, delta: number): string {
  const shifted = new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta);
  return toLocalKey(shifted);
}

interface RetentionRow {
  student_id: string;
  reservation_date: string;
  attendance_status: string;
  profiles: { full_name: string };
}

function retentionRow(
  studentId: string,
  fullName: string,
  reservationDate: string,
  attendanceStatus: string
): RetentionRow {
  return {
    student_id: studentId,
    reservation_date: reservationDate,
    attendance_status: attendanceStatus,
    profiles: { full_name: fullName },
  };
}

// ──────────────────────────────────────────────
// 2. Dependency mocks (same pattern as sibling service tests)
// ──────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('../store/useAuthStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ current_studio_id: STUDIO_ID })),
  },
}));

function mockRetentionRows(rows: RetentionRow[]): void {
  mockFrom.mockReturnValue({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: rows, error: null }),
      })),
    })),
  });
}

describe('reportsService.getRetentionMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
  });

  it('should return null last_attendance for a student with only a future reservation, sorted last', async () => {
    const today = new Date();
    mockRetentionRows([
      retentionRow('stu-active', 'Active Student', shiftDays(today, -3), 'attended'),
      retentionRow('stu-future', 'Future Student', shiftDays(today, 2), 'pending'),
    ]);

    const result = await reportsService.getRetentionMetrics();

    expect(result).toHaveLength(2);
    // Cohort is preserved: the future-only student still appears.
    const future = result.find((r) => r.student_id === 'stu-future');
    expect(future).toMatchObject({ last_attendance: null, days_since_last: null });
    // Nulls sort last, after students with real attendance.
    expect(result[result.length - 1].student_id).toBe('stu-future');
  });

  it('should return null last_attendance for a student with cancelled-only history', async () => {
    const today = new Date();
    mockRetentionRows([
      retentionRow('stu-cancelled', 'Cancelled Student', shiftDays(today, -4), 'cancelled'),
      retentionRow('stu-cancelled', 'Cancelled Student', shiftDays(today, -9), 'cancelled'),
    ]);

    const result = await reportsService.getRetentionMetrics();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ last_attendance: null, days_since_last: null });
  });

  it('should use the latest attended date on or before today with an exact day count', async () => {
    const today = new Date();
    const latestAttended = shiftDays(today, -5);
    mockRetentionRows([
      retentionRow('stu-001', 'Regular Student', shiftDays(today, -40), 'attended'),
      retentionRow('stu-001', 'Regular Student', latestAttended, 'attended'),
    ]);

    const result = await reportsService.getRetentionMetrics();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ last_attendance: latestAttended, days_since_last: 5 });
  });

  it('should count today’s attendance as zero days without attending', async () => {
    const today = new Date();
    mockRetentionRows([retentionRow('stu-001', 'Regular Student', shiftDays(today, 0), 'attended')]);

    const result = await reportsService.getRetentionMetrics();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ days_since_last: 0 });
  });

  it('should prefer past attended history over a future pending reservation', async () => {
    const today = new Date();
    const pastAttended = shiftDays(today, -12);
    mockRetentionRows([
      retentionRow('stu-001', 'Mixed Student', shiftDays(today, 3), 'pending'),
      retentionRow('stu-001', 'Mixed Student', pastAttended, 'attended'),
    ]);

    const result = await reportsService.getRetentionMetrics();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ last_attendance: pastAttended, days_since_last: 12 });
  });

  it('should ignore a future attended row as inconsistent data', async () => {
    const today = new Date();
    mockRetentionRows([
      retentionRow('stu-001', 'Inconsistent Student', shiftDays(today, 4), 'attended'),
    ]);

    const result = await reportsService.getRetentionMetrics();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ last_attendance: null, days_since_last: null });
  });

  it('should sort by descending days with nulls last and deterministic null ordering', async () => {
    const today = new Date();
    mockRetentionRows([
      retentionRow('stu-risk', 'Risk Student', shiftDays(today, -10), 'attended'),
      retentionRow('stu-null-b', 'Zed NoShow', shiftDays(today, -2), 'pending'),
      retentionRow('stu-inactive', 'Inactive Student', shiftDays(today, -45), 'attended'),
      retentionRow('stu-null-a', 'Amy NoShow', shiftDays(today, -1), 'cancelled'),
      retentionRow('stu-fresh', 'Fresh Student', shiftDays(today, -1), 'attended'),
    ]);

    const result = await reportsService.getRetentionMetrics();

    expect(result.map((r) => r.student_id)).toEqual([
      'stu-inactive',
      'stu-risk',
      'stu-fresh',
      'stu-null-a',
      'stu-null-b',
    ]);
    expect(result[3]).toMatchObject({ last_attendance: null, days_since_last: null });
    expect(result[4]).toMatchObject({ last_attendance: null, days_since_last: null });
  });

  it('should query attendance_status so the full enrollment cohort is evaluated', async () => {
    const selectSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    }));
    mockFrom.mockReturnValue({ select: selectSpy });

    await reportsService.getRetentionMetrics();

    expect(mockFrom).toHaveBeenCalledWith('enrollments');
    expect(selectSpy).toHaveBeenCalledWith(expect.stringContaining('attendance_status'));
  });

  it('should propagate query errors', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('Retention query failed') }),
        })),
      })),
    });

    await expect(reportsService.getRetentionMetrics()).rejects.toThrow('Retention query failed');
  });
});
