import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTeacherClasses } from './useTeacherClasses';
import type { ClassEntity } from '@/core/types/classes.types';

const mockGetClassesByTeacher = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  classesService: {
    getClassesByTeacher: mockGetClassesByTeacher,
  },
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

function makeClass(id: string, dayOfWeek: number): ClassEntity {
  return {
    id,
    activity_name: 'Yoga',
    teacher_id: 'teacher-001',
    day_of_week: dayOfWeek,
    start_time: '10:00:00',
    end_time: '11:00:00',
    capacity: 20,
    base_price: 10000,
    teacher_commission_pct: 30,
    is_active: true,
  };
}

// Clock frozen on purpose: the auto-select test derives its "today" fixture from
// `new Date().getDay()`, so with the real clock the test silently depends on the day the
// suite runs on. Freezing it makes "today" deterministic instead of a weekday lottery.
// Wednesday is chosen so it never collides with the weekday fixtures used below
// (Mon=1, Fri=5, Thu=4); the previous `cls-tue` (Tue=2) fixture made the test fail on
// real Tuesdays by shadowing `cls-today` as the first `day_of_week` match.
const FROZEN_TODAY = new Date(2026, 9, 7, 12, 0, 0); // Wed 2026-10-07, local noon

describe('useTeacherClasses', () => {
  beforeEach(() => {
    // Only Date is faked; setTimeout stays real, so `waitFor` keeps working.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FROZEN_TODAY);
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ user: { id: 'teacher-001' } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-selects the class matching today', async () => {
    const today = new Date().getDay();
    const classes = [makeClass('cls-thu', 4), makeClass('cls-today', today), makeClass('cls-fri', 5)];
    mockGetClassesByTeacher.mockResolvedValue(classes);

    const { result } = renderHook(() => useTeacherClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetClassesByTeacher).toHaveBeenCalledWith('teacher-001');
    expect(result.current.selectedClass).toEqual(makeClass('cls-today', today));
  });

  it('falls back to the first class when none matches today', async () => {
    const classes = [makeClass('cls-mon', 1), makeClass('cls-fri', 5)];
    mockGetClassesByTeacher.mockResolvedValue(classes);

    const { result } = renderHook(() => useTeacherClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.selectedClass).toEqual(classes[0]);
  });

  it('switches active tab', async () => {
    mockGetClassesByTeacher.mockResolvedValue([]);

    const { result } = renderHook(() => useTeacherClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeTab).toBe('asistencia');

    act(() => {
      result.current.setActiveTab('padron');
    });

    expect(result.current.activeTab).toBe('padron');
  });
});
