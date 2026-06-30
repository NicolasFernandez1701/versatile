import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service';

// ──────────────────────────────────────────────
// Mock: reemplazamos supabase.auth.* y supabase.from
// ──────────────────────────────────────────────

const { mockFrom, mockAuth } = vi.hoisted(() => {
  // mockFrom returns profile chain on first call, membership chain on second call
  const mockFrom = vi.fn();

  const mockAuth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  };

  return { mockFrom, mockAuth };
});

vi.mock('./supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: mockAuth,
  },
}));

// Helper: set up the sequential from mocks for profile + membership
function setupFromMocks(
  profileData: object | null,
  membershipsData: object[] | null
) {
  // First call → profiles
  mockFrom.mockReturnValueOnce({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: profileData, error: null }),
      })),
    })),
  });
  // Second call → studio_members (array, no maybeSingle)
  mockFrom.mockReturnValueOnce({
    select: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: membershipsData, error: null }),
    })),
  });
}

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
  // ────────────────────────────────────────────
  describe('getCurrentUser', () => {
    it('debería devolver el usuario con perfil y membresía cargados', async () => {
      const mockUser = { id: '1', email: 'test@test.com' };
      const mockProfile = { has_completed_onboarding: true, role: 'admin', full_name: 'Admin' };
      const mockMembership = {
        studio_id: 'studio-001',
        role: 'admin',
        studios: { name: 'Studio Principal' },
      };

      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });
      setupFromMocks(mockProfile, [mockMembership]);

      const result = await authService.getCurrentUser();

      expect(result).toMatchObject({
        ...mockUser,
        profile: mockProfile,
        membership: {
          studio_id: 'studio-001',
          studio_name: 'Studio Principal',
          role: 'admin',
        },
        memberships: [
          {
            studio_id: 'studio-001',
            studio_name: 'Studio Principal',
            role: 'admin',
          },
        ],
      });
      expect(mockAuth.getSession).toHaveBeenCalledOnce();
      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockFrom).toHaveBeenCalledWith('studio_members');
    });

    it('debería devolver membership null si el usuario no pertenece a ningún studio', async () => {
      const mockUser = { id: '1', email: 'test@test.com' };
      const mockProfile = { has_completed_onboarding: false, role: 'student', full_name: null };

      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });
      setupFromMocks(mockProfile, null);

      const result = await authService.getCurrentUser();

      expect(result?.membership).toBeNull();
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
      setupFromMocks(null, null);

      const result = await authService.getCurrentUser();

      expect(result).toMatchObject({
        id: '1',
        email: 'test@test.com',
        profile: null,
        membership: null,
      });
    });

    it('debería lanzar error si getSession falla', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Error de conexión'),
      });

      await expect(authService.getCurrentUser()).rejects.toThrow('Error de conexión');
    });

    it('debería devolver todas las memberships como array para usuario multi-rol', async () => {
      const mockUser = { id: '1', email: 'test@test.com' };
      const mockProfile = { has_completed_onboarding: true, role: 'admin', full_name: 'Admin' };
      const mockMemberships = [
        { studio_id: 'studio-001', role: 'admin', studios: { name: 'Studio Principal' } },
        { studio_id: 'studio-001', role: 'teacher', studios: { name: 'Studio Principal' } },
      ];

      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });

      // Profile query
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          })),
        })),
      });

      // Memberships query (array, no maybeSingle)
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: mockMemberships, error: null }),
        })),
      });

      const result = await authService.getCurrentUser();

      expect(result?.memberships).toHaveLength(2);
      expect(result?.memberships?.[0]).toMatchObject({
        studio_id: 'studio-001',
        studio_name: 'Studio Principal',
        role: 'admin',
      });
      expect(result?.memberships?.[1]).toMatchObject({
        studio_id: 'studio-001',
        studio_name: 'Studio Principal',
        role: 'teacher',
      });
    });
  });

  // ────────────────────────────────────────────
  // onAuthStateChange (subscription)
  // ────────────────────────────────────────────
  describe('onAuthStateChange', () => {
    it('debería llamar al callback con null si no hay sesión', () => {
      mockAuth.onAuthStateChange.mockImplementation((callback: (event: string, session: null) => void) => {
        callback('SIGNED_OUT', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const callback = vi.fn();
      authService.onAuthStateChange(callback);

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('debería enriquecer el usuario con perfil y membresía al iniciar sesión', async () => {
      const mockSession = {
        user: { id: '1', email: 'test@test.com' },
        access_token: 'abc',
      };
      const mockProfile = { has_completed_onboarding: true, role: 'student', full_name: 'Alumno' };
      const mockMembership = {
        studio_id: 'studio-001',
        role: 'student',
        studios: { name: 'Studio Principal' },
      };

      setupFromMocks(mockProfile, [mockMembership]);

      let handlerDone: Promise<void>;
      mockAuth.onAuthStateChange.mockImplementation((cb: (event: string, session: typeof mockSession) => Promise<void>) => {
        handlerDone = cb('SIGNED_IN', mockSession);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const callback = vi.fn();
      authService.onAuthStateChange(callback);

      await handlerDone!;

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            id: '1',
            profile: mockProfile,
            membership: {
              studio_id: 'studio-001',
              studio_name: 'Studio Principal',
              role: 'student',
            },
          }),
        }),
      );
    });

    it('debería enriquecer con membership null si no pertenece a studio', async () => {
      const mockSession = {
        user: { id: '2', email: 'newuser@test.com' },
        access_token: 'def',
      };
      const mockProfile = { has_completed_onboarding: false, role: 'student', full_name: null };

      setupFromMocks(mockProfile, null);

      let handlerDone: Promise<void>;
      mockAuth.onAuthStateChange.mockImplementation((cb: (event: string, session: typeof mockSession) => Promise<void>) => {
        handlerDone = cb('SIGNED_IN', mockSession);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const callback = vi.fn();
      authService.onAuthStateChange(callback);

      await handlerDone!;

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            membership: null,
          }),
        }),
      );
    });
  });
});
