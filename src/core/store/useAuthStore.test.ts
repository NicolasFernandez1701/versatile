import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  it('debería arrancar con estado inicial', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
  });

  it('setUser debería actualizar usuario, rol y auth state', () => {
    const mockUser = {
      id: '1',
      email: 'test@test.com',
      profile: { role: 'admin' as const },
    };

    useAuthStore.getState().setUser(mockUser as any);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.role).toBe('admin');
  });

  it('setUser con null debería desautenticar', () => {
    useAuthStore.setState({
      user: { id: '1' } as any,
      isAuthenticated: true,
      role: 'admin',
    });

    useAuthStore.getState().setUser(null);

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.role).toBeNull();
  });

  it('debería obtener rol de user_metadata si no hay profile', () => {
    const mockUser = {
      id: '1',
      email: 'test@test.com',
      user_metadata: { role: 'teacher' },
    };

    useAuthStore.getState().setUser(mockUser as any);

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

  it('logout debería limpiar todo', () => {
    useAuthStore.setState({
      user: { id: '1' } as any,
      role: 'admin',
      isAuthenticated: true,
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
