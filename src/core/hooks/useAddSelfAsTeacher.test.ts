import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAddSelfAsTeacher, canAddSelfAsTeacher } from './useAddSelfAsTeacher';
import type { StudioMembership } from '@/core/types/auth.types';

const mockAddSelfAsTeacher = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockFetchTeachers = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockSetUser = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  usersService: {
    addSelfAsTeacher: mockAddSelfAsTeacher,
  },
  authService: {
    getCurrentUser: mockGetCurrentUser,
  },
}));

vi.mock('@/core/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    (selector?: (state: ReturnType<typeof mockUseAuthStore>) => unknown) => {
      const state = mockUseAuthStore();
      if (typeof selector === 'function') return selector(state);
      return state;
    },
    { getState: () => ({ setUser: mockSetUser }) },
  ),
}));

vi.mock('@/core/store/useUsersStore', () => ({
  useUsersStore: Object.assign(
    (selector?: (state: { fetchTeachers: typeof mockFetchTeachers }) => unknown) => {
      const state = { fetchTeachers: mockFetchTeachers };
      if (typeof selector === 'function') return selector(state);
      return state;
    },
    { getState: () => ({ fetchTeachers: mockFetchTeachers }) },
  ),
}));

vi.mock('@/core/components/GlobalAlertProvider', () => ({
  useAlert: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

const STUDIO_ID = 'studio-001';

describe('canAddSelfAsTeacher', () => {
  it('returns false when studioId is null', () => {
    expect(canAddSelfAsTeacher([{ studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' }], null)).toBe(false);
  });

  it('returns false when memberships are empty', () => {
    expect(canAddSelfAsTeacher([], STUDIO_ID)).toBe(false);
  });

  it('returns true when user is admin only', () => {
    expect(canAddSelfAsTeacher([{ studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' }], STUDIO_ID)).toBe(true);
  });

  it('returns false when user is admin and teacher in the same studio', () => {
    expect(
      canAddSelfAsTeacher(
        [
          { studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' },
          { studio_id: STUDIO_ID, studio_name: 'Studio', role: 'teacher' },
        ],
        STUDIO_ID,
      ),
    ).toBe(false);
  });

  it('returns true when user is admin in current studio but teacher in another studio', () => {
    expect(
      canAddSelfAsTeacher(
        [
          { studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' },
          { studio_id: 'studio-002', studio_name: 'Other', role: 'teacher' },
        ],
        STUDIO_ID,
      ),
    ).toBe(true);
  });

  it('returns false when user is teacher only', () => {
    expect(canAddSelfAsTeacher([{ studio_id: STUDIO_ID, studio_name: 'Studio', role: 'teacher' }], STUDIO_ID)).toBe(false);
  });
});

describe('useAddSelfAsTeacher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddSelfAsTeacher.mockResolvedValue(undefined);
    mockGetCurrentUser.mockResolvedValue(null);
  });

  function setupStore(memberships: StudioMembership[], studioId: string | null = STUDIO_ID) {
    mockUseAuthStore.mockReturnValue({
      memberships,
      current_studio_id: studioId,
    });
  }

  it('returns canAdd=true when user is admin without teacher membership', () => {
    setupStore([{ studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' }]);

    const { result } = renderHook(() => useAddSelfAsTeacher());

    expect(result.current.canAdd).toBe(true);
  });

  it('returns canAdd=false when user already has teacher membership', () => {
    setupStore([
      { studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' },
      { studio_id: STUDIO_ID, studio_name: 'Studio', role: 'teacher' },
    ]);

    const { result } = renderHook(() => useAddSelfAsTeacher());

    expect(result.current.canAdd).toBe(false);
  });

  it('calls addSelfAsTeacher, refreshes session and teachers on success', async () => {
    const refreshedUser = { id: 'user-001' } as unknown as import('@/core/types/auth.types').AppUser;
    mockGetCurrentUser.mockResolvedValue(refreshedUser);
    setupStore([{ studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' }]);

    const { result } = renderHook(() => useAddSelfAsTeacher());

    await act(async () => {
      await result.current.addSelfAsTeacher();
    });

    expect(mockAddSelfAsTeacher).toHaveBeenCalledWith(STUDIO_ID);
    expect(mockGetCurrentUser).toHaveBeenCalled();
    expect(mockSetUser).toHaveBeenCalledWith(refreshedUser);
    expect(mockShowSuccess).toHaveBeenCalledWith('Ahora sos profesor de este estudio.');
    expect(mockFetchTeachers).toHaveBeenCalled();
  });

  it('does nothing when there is no active studio', async () => {
    setupStore([{ studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' }], null);

    const { result } = renderHook(() => useAddSelfAsTeacher());

    await act(async () => {
      await result.current.addSelfAsTeacher();
    });

    expect(mockAddSelfAsTeacher).not.toHaveBeenCalled();
  });

  it('shows error when addSelfAsTeacher fails', async () => {
    mockAddSelfAsTeacher.mockRejectedValueOnce(new Error('Ya sos profesor'));
    setupStore([{ studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' }]);

    const { result } = renderHook(() => useAddSelfAsTeacher());

    await act(async () => {
      await result.current.addSelfAsTeacher();
    });

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Ya sos profesor');
    });
  });
});
