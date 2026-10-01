import { render, fireEvent, waitFor } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StudentClassesPage } from './StudentClassesPage';
import { useStudentClassesData } from '@/core/hooks/student/useStudentClassesData';
import type { AttendanceRecord } from '@/core/types/attendance.types';
import type { ClassEntity } from '@/core/types/classes.types';
import type { StudentClassLimit } from '@/core/types/dashboard.types';

const mockEnrollStudent = vi.hoisted(() => vi.fn());
const mockUnenrollStudent = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  enrollmentsService: {
    enrollStudent: mockEnrollStudent,
    unenrollStudent: mockUnenrollStudent,
  },
}));

vi.mock('@/ui/useAlert', () => ({
  useAlert: () => ({
    showAlert: vi.fn(),
    showError: mockShowError,
    showSuccess: mockShowSuccess,
  }),
}));

vi.mock('@/core/store/useAuthStore', () => ({
  useAuthStore: () => ({ user: { id: 'student-1' }, current_studio_id: 'studio-1' }),
}));

vi.mock('@/core/hooks/student/useStudentClassesData', () => ({
  useStudentClassesData: vi.fn(),
}));

// Monday 2026-08-31: the current week starts in the previous month, which is the
// case where chained setDate() calls used to drift into earlier months.
const MONDAY_WEEK_CROSSES_MONTH = new Date(2026, 7, 31, 12, 0, 0);
// Tuesday 2026-09-15: the current week starts inside the same month.
const TUESDAY_MID_MONTH = new Date(2026, 8, 15, 12, 0, 0);
// Wednesday of the MONDAY_WEEK_CROSSES_MONTH week.
const WEDNESDAY_OF_CROSS_MONTH_WEEK = new Date(2026, 8, 2, 12, 0, 0);

const PLAN_LIMITS: StudentClassLimit = { limit: 10, classesPerWeek: 5, perActivity: {} };

const WEDNESDAY_CLASS: ClassEntity = {
  id: 'class-wed',
  activity_name: 'Boxeo',
  teacher_id: 'teacher-1',
  day_of_week: 3,
  start_time: '19:00:00',
  end_time: '20:00:00',
  capacity: 20,
  base_price: 0,
  teacher_commission_pct: 0,
  is_active: true,
};

// Mirrors the app's own date convention: a local-noon date rendered as its UTC day.
function isoDay(date: Date): string {
  return date.toISOString().split('T')[0];
}

function localMonthDay(date: Date): string {
  return `${date.getMonth() + 1}-${date.getDate()}`;
}

function weekShape(week: Record<number, Date>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(week).map(([dayOfWeek, date]) => [dayOfWeek, localMonthDay(date)]),
  );
}

interface DataOverrides {
  loading?: boolean;
  classesList?: ClassEntity[];
  reservations?: AttendanceRecord[];
}

// Stubs the data hook and records the week map it receives. The derived default
// mirrors the fetch gate: an empty week map leaves the resource disabled and a
// disabled gate reports loading:false.
function stubDataHook(seenWeeks: Array<Record<number, Date>>, overrides: DataOverrides = {}) {
  vi.mocked(useStudentClassesData).mockImplementation((weekDates: Record<number, Date>) => {
    seenWeeks.push(weekDates);

    return {
      loading: overrides.loading ?? Object.keys(weekDates).length > 0,
      classesList: overrides.classesList ?? [],
      reservations: overrides.reservations ?? [],
      planLimits: PLAN_LIMITS,
      loadData: async () => {},
    };
  });
}

function renderPageRecordingFrames(frames: string[]) {
  function Frames() {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      frames.push(ref.current?.innerHTML ?? '');
    });

    return (
      <div ref={ref}>
        <StudentClassesPage />
      </div>
    );
  }

  return render(<Frames />);
}

describe('StudentClassesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the loader on the first frame instead of an empty grid', () => {
    vi.setSystemTime(MONDAY_WEEK_CROSSES_MONTH);
    stubDataHook([]);
    const frames: string[] = [];

    renderPageRecordingFrames(frames);

    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0]).toContain('loader-container');
    expect(frames[0]).not.toContain('Reservar Clases');
  });

  it('covers the whole week when the current week started in the previous month', () => {
    vi.setSystemTime(MONDAY_WEEK_CROSSES_MONTH);
    const seenWeeks: Array<Record<number, Date>> = [];
    stubDataHook(seenWeeks);

    renderPageRecordingFrames([]);

    expect(Object.keys(seenWeeks[0]).map(Number).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(weekShape(seenWeeks[0])).toEqual({
      1: '8-31',
      2: '9-1',
      3: '9-2',
      4: '9-3',
      5: '9-4',
      6: '9-5',
      0: '9-6',
    });
  });

  it('covers the whole week when the current week starts inside the month', () => {
    vi.setSystemTime(TUESDAY_MID_MONTH);
    const seenWeeks: Array<Record<number, Date>> = [];
    stubDataHook(seenWeeks);

    renderPageRecordingFrames([]);

    expect(Object.keys(seenWeeks[0]).map(Number).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(weekShape(seenWeeks[0])).toEqual({
      1: '9-14',
      2: '9-15',
      3: '9-16',
      4: '9-17',
      5: '9-18',
      6: '9-19',
      0: '9-20',
    });
  });

  it('shows an existing reservation for the rendered day as reserved', () => {
    vi.setSystemTime(MONDAY_WEEK_CROSSES_MONTH);
    const reservation: AttendanceRecord = {
      id: 'enr-1',
      enrollment_id: 'enr-1',
      date: isoDay(WEDNESDAY_OF_CROSS_MONTH_WEEK),
      status: 'confirmed',
      enrollments: { student_id: 'student-1', class_id: 'class-wed' },
    };
    stubDataHook([], { loading: false, classesList: [WEDNESDAY_CLASS], reservations: [reservation] });

    const { getByText } = render(<StudentClassesPage />);

    expect(getByText(`Miércoles - ${isoDay(WEDNESDAY_OF_CROSS_MONTH_WEEK)}`)).toBeTruthy();
    expect(getByText('Reservado')).toBeTruthy();
    expect(getByText('Cancelar')).toBeTruthy();
  });

  it('books the class with a real date instead of failing on an undefined one', async () => {
    vi.setSystemTime(MONDAY_WEEK_CROSSES_MONTH);
    mockEnrollStudent.mockResolvedValue(undefined);
    stubDataHook([], { loading: false, classesList: [WEDNESDAY_CLASS] });

    const { getByText } = render(<StudentClassesPage />);
    fireEvent.click(getByText('Reservar Lugar'));

    await waitFor(() => {
      expect(mockEnrollStudent).toHaveBeenCalledWith(
        'student-1',
        'class-wed',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      );
    });
    expect(mockShowError).not.toHaveBeenCalled();
  });
});
