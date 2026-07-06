import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('useTeacherClasses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ user: { id: 'teacher-001' } });
  });

  it('auto-selects the class matching today', async () => {
    const today = new Date().getDay();
    const classes = [makeClass('cls-tue', 2), makeClass('cls-today', today), makeClass('cls-fri', 5)];
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
