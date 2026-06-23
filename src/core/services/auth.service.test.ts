import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service';

// ──────────────────────────────────────────────
// Mock: reemplazamos supabase.auth.* y supabase.from
// ──────────────────────────────────────────────

const { mockFrom, mockSingle, mockAuth } = vi.hoisted(() => {
  const mockSingle = vi.fn();

  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: mockSingle,
      })),
    })),
  }));

  const mockAuth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  };

  return { mockFrom, mockSingle, mockAuth };
});

vi.mock('./supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: mockAuth,
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────
  // login
  // ────────────────────────────────────────────
  describe('login', () => {
    it('debería iniciar sesión con email y password', async () => {
      const mockSession = { user: { id: '1', email: 'test@test.com' }, session: 'abc' };
      mockAuth.signInWithPassword.mockResolvedValue({
        data: mockSession,
        error: null,
      });

      const result = await authService.login('test@test.com', 'pass123');

      expect(result).toEqual(mockSession);
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'pass123',
      });
    });

    it('debería lanzar error si las credenciales son inválidas', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: null,
        error: new Error('Invalid login credentials'),
      });

      await expect(authService.login('bad@test.com', 'wrong')).rejects.toThrow(
        'Invalid login credentials',
      );
    });
  });

  // ────────────────────────────────────────────
  // register
  // ────────────────────────────────────────────
  describe('register', () => {
    const params = {
      email: 'nuevo@test.com',
      password: 'pass123',
      full_name: 'Nuevo Usuario',
    };

    it('debería registrar un nuevo usuario', async () => {
      const mockUser = { user: { id: '2', email: params.email } };
      mockAuth.signUp.mockResolvedValue({ data: mockUser, error: null });

      const result = await authService.register(params);

      expect(result).toEqual(mockUser);
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: params.email,
        password: params.password,
        options: { data: { full_name: params.full_name } },
      });
    });

    it('debería lanzar error si el registro falla', async () => {
      mockAuth.signUp.mockResolvedValue({
        data: null,
        error: new Error('User already registered'),
      });

      await expect(authService.register(params)).rejects.toThrow('User already registered');
    });
  });

  // ────────────────────────────────────────────
  // logout
  // ────────────────────────────────────────────
  describe('logout', () => {
    it('debería cerrar sesión', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });

      await authService.logout();

      expect(mockAuth.signOut).toHaveBeenCalledOnce();
    });

    it('debería lanzar error si el logout falla', async () => {
      mockAuth.signOut.mockResolvedValue({ error: new Error('Error al cerrar sesión') });

      await expect(authService.logout()).rejects.toThrow('Error al cerrar sesión');
    });
  });

  // ────────────────────────────────────────────
  // getCurrentUser
  //   1. Obtiene la sesión actual
  //   2. Si hay usuario, busca el perfil en profiles
  // ────────────────────────────────────────────
  describe('getCurrentUser', () => {
    it('debería devolver el usuario autenticado con su perfil', async () => {
      const mockUser = { id: '1', email: 'test@test.com' };
      const mockProfile = { has_completed_onboarding: true, role: 'admin', full_name: 'Admin' };

      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });
      mockSingle.mockResolvedValue({ data: mockProfile, error: null });

      const result = await authService.getCurrentUser();

      expect(result).toMatchObject({
        ...mockUser,
        profile: mockProfile,
      });
      expect(mockAuth.getSession).toHaveBeenCalledOnce();
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('debería devolver null si no hay sesión activa', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });

    it('debería devolver perfil null si el usuario no tiene profile en DB', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: '1', email: 'test@test.com' } } },
        error: null,
      });
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await authService.getCurrentUser();

      expect(result).toMatchObject({
        id: '1',
        email: 'test@test.com',
        profile: null,
      });
    });

    it('debería lanzar error si getSession falla', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Error de conexión'),
      });

      await expect(authService.getCurrentUser()).rejects.toThrow('Error de conexión');
    });
  });

  // ────────────────────────────────────────────
  // onAuthStateChange (susbscription)
  // ────────────────────────────────────────────
  describe('onAuthStateChange', () => {
    it('debería llamar al callback con null si no hay sesión', () => {
      mockAuth.onAuthStateChange.mockImplementation((callback: Function) => {
        // Simulamos que el evento se dispara con session null
        callback('SIGNED_OUT', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const callback = vi.fn();
      authService.onAuthStateChange(callback);

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('debería enriquecer el usuario con el perfil al iniciar sesión', async () => {
      const mockSession = {
        user: { id: '1', email: 'test@test.com' },
        access_token: 'abc',
      };
      const mockProfile = { has_completed_onboarding: true, role: 'student', full_name: 'Alumno' };

      mockSingle.mockResolvedValue({ data: mockProfile, error: null });

      // Disparamos la callback y esperamos a que el handler async termine
      let handlerDone: Promise<void>;
      mockAuth.onAuthStateChange.mockImplementation((cb: Function) => {
        handlerDone = cb('SIGNED_IN', mockSession);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const callback = vi.fn();
      authService.onAuthStateChange(callback);

      // Esperamos a que el handler async procese el perfil
      await handlerDone!;

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            id: '1',
            profile: mockProfile,
          }),
        }),
      );
    });
  });
});
