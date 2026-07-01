import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAddSelfAsTeacher } from './useAddSelfAsTeacher';
import { useAuthStore } from '@/core/store/useAuthStore';

const mockFetchTeachers = vi.hoisted(() => vi.fn());
const mockReset = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockAddSelfAsTeacher = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  usersService: {
    addSelfAsTeacher: mockAddSelfAsTeacher,
  },
  authService: {
    getCurrentUser: mockGetCurrentUser,
  },
}));

vi.mock('@/core/store/useUsersStore', () => ({
  useUsersStore: Object.assign(
    (selector?: (state: { fetchTeachers: typeof mockFetchTeachers; reset: typeof mockReset }) => unknown) => {
      const state = { fetchTeachers: mockFetchTeachers, reset: mockReset };
      if (typeof selector === 'function') return selector(state);
      return state;
    },
    { getState: () => ({ fetchTeachers: mockFetchTeachers, reset: mockReset }) },
  ),
}));

vi.mock('@/core/components/GlobalAlertProvider', () => ({
  useAlert: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

describe('useAddSelfAsTeacher stability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      role: null,
      activeRole: null,
      memberships: [],
      current_studio_id: null,
      membership: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  it('does not cause infinite re-renders when the hook re-renders with unchanged auth state', () => {
    useAuthStore.setState({
      memberships: [{ studio_id: 'studio-001', studio_name: 'Studio', role: 'admin' }],
      current_studio_id: 'studio-001',
      activeRole: 'admin',
      role: 'admin',
      isAuthenticated: true,
      isLoading: false,
    });

    let renderCount = 0;
    const { rerender, result } = renderHook(() => {
      const hookResult = useAddSelfAsTeacher();
      renderCount++;
      return hookResult;
    });

    expect(result.current.canAdd).toBe(true);
    expect(renderCount).toBe(1);

    rerender();

    expect(result.current.canAdd).toBe(true);
    expect(renderCount).toBe(2);
  });

  it('remains stable when the user is not eligible to add themselves as teacher', () => {
    useAuthStore.setState({
      memberships: [{ studio_id: 'studio-001', studio_name: 'Studio', role: 'teacher' }],
      current_studio_id: 'studio-001',
      activeRole: 'teacher',
      role: 'teacher',
      isAuthenticated: true,
      isLoading: false,
    });

    let renderCount = 0;
    const { rerender, result } = renderHook(() => {
      const hookResult = useAddSelfAsTeacher();
      renderCount++;
      return hookResult;
    });

    expect(result.current.canAdd).toBe(false);
    expect(renderCount).toBe(1);

    rerender();

    expect(result.current.canAdd).toBe(false);
    expect(renderCount).toBe(2);
  });
});
