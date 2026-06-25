import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usersService } from './users.service';
import type { UserProfile } from '../types/users.types';

// ──────────────────────────────────────────────
// 1. Datos de prueba
// ──────────────────────────────────────────────

const mockStudents: UserProfile[] = [
  {
    id: 'stu-001',
    email: 'alumna@test.com',
    full_name: 'María García',
    role: 'student',
    created_at: '2024-03-15T10:00:00Z',
    plans: { id: 'plan-001', name: 'Plan Mensual', price: 25000, classes_per_week: 3 },
  },
  {
    id: 'stu-002',
    email: 'juan@test.com',
    full_name: 'Juan Pérez',
    role: 'student',
    created_at: '2024-03-10T08:00:00Z',
  },
];

const mockTeachers: UserProfile[] = [
  {
    id: 'tea-001',
    email: 'profe@test.com',
    full_name: 'Laura Martínez',
    role: 'teacher',
    created_at: '2024-02-01T09:00:00Z',
  },
];

const mockSpecialties = [
  { id: 'spec-001', name: 'Ballet Clásico' },
  { id: 'spec-002', name: 'Hip Hop' },
];

const STUDIO_ID = 'studio-001';

// ──────────────────────────────────────────────
// 2. Mock de Supabase
// ──────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

// Mockeamos @supabase/supabase-js completa para controlar authClient
const { mockSignUp, mockUpdateUser, mockSupabaseAuth } = vi.hoisted(() => {
  const mockSignUp = vi.fn();
  const mockUpdateUser = vi.fn();
  const mockSupabaseAuth = {
    auth: { signUp: mockSignUp, updateUser: mockUpdateUser },
  };

  return { mockSignUp, mockUpdateUser, mockSupabaseAuth };
});

vi.mock('./supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: mockSupabaseAuth.auth,
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { signUp: mockSignUp, updateUser: mockUpdateUser },
  })),
}));

describe('usersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────
  // getStudents (requires studioId)
  // ────────────────────────────────────────────
  describe('getStudents', () => {
    beforeEach(() => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: mockStudents, error: null }),
            })),
          })),
        })),
      });
    });

    it('debería devolver la lista de alumnos filtrados por studio', async () => {
      const result = await usersService.getStudents(STUDIO_ID);

      expect(result).toEqual(mockStudents);
      expect(result).toHaveLength(2);
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('debería lanzar error si Supabase falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: null, error: new Error('Error de conexión') }),
            })),
          })),
        })),
      });

      await expect(usersService.getStudents(STUDIO_ID)).rejects.toThrow('Error de conexión');
    });
  });

  // ────────────────────────────────────────────
  // getTeachers (requires studioId)
  // ────────────────────────────────────────────
  describe('getTeachers', () => {
    beforeEach(() => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: mockTeachers, error: null }),
            })),
          })),
        })),
      });
    });

    it('debería devolver la lista de profesores filtrados por studio', async () => {
      const result = await usersService.getTeachers(STUDIO_ID);

      expect(result).toEqual(mockTeachers);
      expect(result).toHaveLength(1);
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('debería lanzar error si Supabase falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: null, error: new Error('Error DB') }),
            })),
          })),
        })),
      });

      await expect(usersService.getTeachers(STUDIO_ID)).rejects.toThrow('Error DB');
    });
  });

  // ────────────────────────────────────────────
  // getSpecialties
  // ────────────────────────────────────────────
  describe('getSpecialties', () => {
    beforeEach(() => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: mockSpecialties, error: null }),
        })),
      });
    });

    it('debería devolver las especialidades', async () => {
      const result = await usersService.getSpecialties();

      expect(result).toEqual(mockSpecialties);
      expect(result).toHaveLength(2);
      expect(mockFrom).toHaveBeenCalledWith('specialties');
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('Error al obtener especialidades') }),
        })),
      });

      await expect(usersService.getSpecialties()).rejects.toThrow('Error al obtener especialidades');
    });
  });

  // ────────────────────────────────────────────
  // createUser — requires explicit password + studio_id
  // ────────────────────────────────────────────
  describe('createUser', () => {
    const payload = {
      email: 'nuevo@test.com',
      full_name: 'Nuevo Usuario',
      role: 'student' as const,
      password: 'pass123',
      studio_id: STUDIO_ID,
    };

    it('debería crear un usuario en Auth con studio_id en options.data', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'new-001' } },
        error: null,
      });

      await usersService.createUser(payload);

      expect(mockSignUp).toHaveBeenCalledWith({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            full_name: payload.full_name,
            phone: undefined,
            role: payload.role,
            studio_id: STUDIO_ID,
          },
        },
      });
    });

    it('debería lanzar error si Auth falla', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: new Error('Email ya registrado'),
      });

      await expect(usersService.createUser(payload)).rejects.toThrow('Email ya registrado');
    });

    it('debería lanzar error si no devuelve user', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(usersService.createUser(payload)).rejects.toThrow('No se pudo crear el usuario');
    });
  });

  // ────────────────────────────────────────────
  // updateUser
  // ────────────────────────────────────────────
  describe('updateUser', () => {
    beforeEach(() => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });
    });

    it('debería actualizar un usuario', async () => {
      await usersService.updateUser('stu-001', { full_name: 'Nombre Actualizado' });

      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('debería lanzar error si la actualización falla', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al actualizar') }),
        })),
      });

      await expect(
        usersService.updateUser('stu-001', { full_name: 'Test' }),
      ).rejects.toThrow('Error al actualizar');
    });
  });

  // ────────────────────────────────────────────
  // deleteUser
  // ────────────────────────────────────────────
  describe('deleteUser', () => {
    beforeEach(() => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });
    });

    it('debería eliminar un usuario', async () => {
      await usersService.deleteUser('stu-001');

      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('debería lanzar error si la eliminación falla', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al eliminar') }),
        })),
      });

      await expect(usersService.deleteUser('stu-001')).rejects.toThrow('Error al eliminar');
    });
  });

  // ────────────────────────────────────────────
  // updatePassword (usa supabase.auth.updateUser)
  // ────────────────────────────────────────────
  describe('updatePassword', () => {
    it('debería actualizar la contraseña', async () => {
      mockUpdateUser.mockResolvedValue({ error: null });

      await usersService.updatePassword('nueva-pass-123');

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'nueva-pass-123' });
    });

    it('debería lanzar error si falla', async () => {
      mockUpdateUser.mockResolvedValue({ error: new Error('Error de Auth') });

      await expect(usersService.updatePassword('nueva-pass')).rejects.toThrow('Error de Auth');
    });
  });

  // ────────────────────────────────────────────
  // saveOnboardingDetails (insert + update)
  // ────────────────────────────────────────────
  describe('saveOnboardingDetails', () => {
    beforeEach(() => {
      mockFrom.mockReturnValue({
        insert: vi.fn(() => ({
          then: undefined,
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });
    });

    it('debería guardar detalles y marcar onboarding como completo', async () => {
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await usersService.saveOnboardingDetails('stu-001', { birth_date: '2000-01-01' });

      expect(mockFrom).toHaveBeenCalledTimes(2);
      expect(mockFrom).toHaveBeenNthCalledWith(1, 'student_details');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'profiles');
    });

    it('debería lanzar error si el insert falla', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: new Error('Error al insertar detalles') }),
      });

      await expect(
        usersService.saveOnboardingDetails('stu-001', { birth_date: '2000-01-01' }),
      ).rejects.toThrow('Error al insertar detalles');
    });

    it('debería lanzar error si el update falla', async () => {
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al actualizar perfil') }),
        })),
      });

      await expect(
        usersService.saveOnboardingDetails('stu-001', { birth_date: '2000-01-01' }),
      ).rejects.toThrow('Error al actualizar perfil');
    });
  });

  // ────────────────────────────────────────────
  // saveTeacherOnboardingDetails (insert + update)
  // ────────────────────────────────────────────
  describe('saveTeacherOnboardingDetails', () => {
    it('debería guardar detalles del profesor y marcar onboarding completo', async () => {
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await usersService.saveTeacherOnboardingDetails('tea-001', { specialties: ['Ballet'] });

      expect(mockFrom).toHaveBeenCalledTimes(2);
      expect(mockFrom).toHaveBeenNthCalledWith(1, 'teacher_details');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'profiles');
    });

    it('debería lanzar error si falla el insert', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: new Error('Error DB') }),
      });

      await expect(
        usersService.saveTeacherOnboardingDetails('tea-001', { specialties: ['Ballet'] }),
      ).rejects.toThrow('Error DB');
    });

    it('debería lanzar error si falla el update del perfil', async () => {
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al actualizar perfil') }),
        })),
      });

      await expect(
        usersService.saveTeacherOnboardingDetails('tea-001', { specialties: ['Ballet'] }),
      ).rejects.toThrow('Error al actualizar perfil');
    });
  });
});
