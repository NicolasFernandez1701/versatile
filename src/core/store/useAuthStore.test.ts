import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AppUser, StudioMembership } from '../types/auth.types';
import { useAuthStore } from './useAuthStore';

const mockReset = vi.hoisted(() => vi.fn());

vi.mock('./useUsersStore', () => ({
  useUsersStore: {
    getState: () => ({ reset: mockReset }),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
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
    mockReset.mockClear();
  });

  it('debería arrancar con estado inicial', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.role).toBeNull();
    expect(state.current_studio_id).toBeNull();
    expect(state.membership).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
  });

  it('setUser debería actualizar usuario, rol y auth state desde profile', () => {
    const mockUser = {
      id: '1',
      email: 'test@test.com',
      profile: { role: 'admin' as const, has_completed_onboarding: true },
    } as AppUser;

    useAuthStore.getState().setUser(mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.role).toBe('admin');
    expect(state.current_studio_id).toBeNull();
    expect(state.membership).toBeNull();
  });

  it('setUser con membership debería derivar role y current_studio_id desde membership', () => {
    const mockMembership: StudioMembership = {
      studio_id: 'studio-abc',
      studio_name: 'Studio ABC',
      role: 'teacher',
    };
    const mockUser = {
      id: '2',
      email: 'teacher@test.com',
      profile: { role: 'student' as const, has_completed_onboarding: false },
      membership: mockMembership,
    } as AppUser;

    useAuthStore.getState().setUser(mockUser);

    const state = useAuthStore.getState();
    // membership.role takes priority over profile.role
    expect(state.role).toBe('teacher');
    expect(state.current_studio_id).toBe('studio-abc');
    expect(state.membership).toEqual(mockMembership);
    expect(state.isAuthenticated).toBe(true);
  });

  it('setUser con null debería desautenticar y limpiar studio', () => {
    useAuthStore.setState({
      user: { id: '1' } as AppUser,
      isAuthenticated: true,
      role: 'admin',
      current_studio_id: 'studio-xyz',
      membership: { studio_id: 'studio-xyz', studio_name: 'Studio XYZ', role: 'admin' },
    });

    useAuthStore.getState().setUser(null);

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.role).toBeNull();
    expect(state.current_studio_id).toBeNull();
    expect(state.membership).toBeNull();
  });

  it('debería obtener rol de user_metadata si no hay profile ni membership', () => {
    const mockUser = {
      id: '1',
      email: 'test@test.com',
      user_metadata: { role: 'teacher' },
    } as unknown as AppUser;

    useAuthStore.getState().setUser(mockUser);

    expect(useAuthStore.getState().role).toBe('teacher');
  });

  it('setRole debería actualizar el rol', () => {
    useAuthStore.getState().setRole('teacher');
    expect(useAuthStore.getState().role).toBe('teacher');
  });

  it('setLoading debería actualizar isLoading', () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('logout debería limpiar todo incluyendo studio', () => {
    useAuthStore.setState({
      user: { id: '1' } as AppUser,
      role: 'admin',
      isAuthenticated: true,
      current_studio_id: 'studio-xyz',
      membership: { studio_id: 'studio-xyz', studio_name: 'Studio XYZ', role: 'admin' },
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.current_studio_id).toBeNull();
    expect(state.membership).toBeNull();
  });

  it('getCurrentStudioId debería devolver el current_studio_id del estado', () => {
    useAuthStore.setState({ current_studio_id: 'studio-123' });
    expect(useAuthStore.getState().getCurrentStudioId()).toBe('studio-123');
  });

  it('getCurrentStudioId debería devolver null cuando no hay studio activo', () => {
    expect(useAuthStore.getState().getCurrentStudioId()).toBeNull();
  });

  it('AuthState shape soporta memberships, activeRole y setActiveRole', () => {
    const mockUser = {
      id: '1',
      email: 'test@test.com',
      memberships: [
        { studio_id: 'studio-1', studio_name: 'Studio 1', role: 'admin' },
        { studio_id: 'studio-1', studio_name: 'Studio 1', role: 'teacher' },
      ],
    } as AppUser;

    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().setActiveRole('teacher');

    const state = useAuthStore.getState();
    expect(state.memberships).toHaveLength(2);
    expect(state.activeRole).toBe('teacher');
  });

  describe('activeRole subscription resets role-dependent stores', () => {
    it('calls useUsersStore.reset when activeRole changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      useAuthStore.getState().setActiveRole('teacher');

      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('does not call reset when activeRole is set to the same value', async () => {
      useAuthStore.setState({ activeRole: 'teacher' });
      await new Promise((resolve) => setTimeout(resolve, 0));
      mockReset.mockClear();

      useAuthStore.getState().setActiveRole('teacher');

      expect(mockReset).not.toHaveBeenCalled();
    });
  });
});
