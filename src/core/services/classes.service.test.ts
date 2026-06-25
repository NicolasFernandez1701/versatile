import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classesService } from './classes.service';
import type { ClassEntity } from '../types/classes.types';

// ──────────────────────────────────────────────
// 1. Datos de prueba
// ──────────────────────────────────────────────

const STUDIO_ID = 'studio-001';

const mockClasses: ClassEntity[] = [
  {
    id: 'cls-001',
    activity_name: 'Ballet Clásico',
    teacher_id: 'tea-001',
    day_of_week: 1,
    start_time: '10:00',
    end_time: '11:00',
    capacity: 15,
    base_price: 5000,
    teacher_commission_pct: 50,
    is_active: true,
  },
  {
    id: 'cls-002',
    activity_name: 'Hip Hop',
    teacher_id: 'tea-002',
    day_of_week: 3,
    start_time: '18:00',
    end_time: '19:00',
    capacity: 20,
    base_price: 4000,
    teacher_commission_pct: 50,
    is_active: true,
  },
];

const mockEnrollments: unknown[] = [
  {
    id: 'enr-001',
    reservation_date: '2024-06-15',
    attendance_status: 'confirmed',
    profiles: { id: 'stu-001', full_name: 'María García', email: 'maria@test.com', phone: '123456789' },
  },
];

const mockTeachers: unknown[] = [
  { id: 'tea-001', full_name: 'Laura Martínez', email: 'laura@test.com', role: 'teacher' },
];

// ──────────────────────────────────────────────
// 2. Mock de Supabase
// ──────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { from: mockFrom },
}));

// Mock the auth store so write operations can read current_studio_id
vi.mock('../store/useAuthStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ current_studio_id: STUDIO_ID })),
  },
}));

describe('classesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────
  // getClasses (filtered by studioId)
  // ────────────────────────────────────────────
  describe('getClasses', () => {
    it('debería devolver la lista de clases filtradas por studio', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: mockClasses, error: null }),
          })),
        })),
      });

      const result = await classesService.getClasses(STUDIO_ID);

      expect(result).toEqual(mockClasses);
      expect(mockFrom).toHaveBeenCalledWith('classes');
    });

    it('debería lanzar error si Supabase falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: null, error: new Error('Error de conexión') }),
          })),
        })),
      });

      await expect(classesService.getClasses(STUDIO_ID)).rejects.toThrow('Error de conexión');
    });
  });

  // ────────────────────────────────────────────
  // getClassesByTeacher
  // ────────────────────────────────────────────
  describe('getClassesByTeacher', () => {
    it('debería devolver clases filtradas por teacher_id con doble orden', async () => {
      const mockOrderStartTime = vi.fn().mockResolvedValue({ data: mockClasses, error: null });
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: mockOrderStartTime,
            })),
          })),
        })),
      });

      const result = await classesService.getClassesByTeacher('tea-001');

      expect(result).toEqual(mockClasses);
      expect(mockFrom).toHaveBeenCalledWith('classes');
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: null, error: new Error('Error DB') }),
            })),
          })),
        })),
      });

      await expect(classesService.getClassesByTeacher('tea-999')).rejects.toThrow('Error DB');
    });
  });

  // ────────────────────────────────────────────
  // deleteClass
  // ────────────────────────────────────────────
  describe('deleteClass', () => {
    it('debería eliminar una clase por ID', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await classesService.deleteClass('cls-001');

      expect(mockFrom).toHaveBeenCalledWith('classes');
    });

    it('debería lanzar error si la eliminación falla', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al eliminar') }),
        })),
      });

      await expect(classesService.deleteClass('cls-999')).rejects.toThrow('Error al eliminar');
    });
  });

  // ────────────────────────────────────────────
  // getEnrolledStudents
  // ────────────────────────────────────────────
  describe('getEnrolledStudents', () => {
    it('debería devolver inscriptos sin filtrar por fecha', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: mockEnrollments, error: null }),
        })),
      });

      const result = await classesService.getEnrolledStudents('cls-001');

      expect(result).toEqual(mockEnrollments);
      expect(mockFrom).toHaveBeenCalledWith('enrollments');
    });

    it('debería filtrar por fecha cuando se provee', async () => {
      const mockEqResDate = vi.fn().mockResolvedValue({ data: mockEnrollments, error: null });
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ eq: mockEqResDate })),
        })),
      });

      const result = await classesService.getEnrolledStudents('cls-001', '2024-06-15');

      expect(result).toEqual(mockEnrollments);
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Error al obtener inscriptos') }),
        })),
      });

      await expect(classesService.getEnrolledStudents('cls-001')).rejects.toThrow('Error al obtener inscriptos');
    });
  });

  // ────────────────────────────────────────────
  // cancelEnrollment
  // ────────────────────────────────────────────
  describe('cancelEnrollment', () => {
    it('debería cancelar una inscripción', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await classesService.cancelEnrollment('enr-001');

      expect(mockFrom).toHaveBeenCalledWith('enrollments');
    });

    it('debería lanzar error si falla', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al cancelar') }),
        })),
      });

      await expect(classesService.cancelEnrollment('enr-999')).rejects.toThrow('Error al cancelar');
    });
  });

  // ────────────────────────────────────────────
  // getTeachers
  // ────────────────────────────────────────────
  describe('getTeachers', () => {
    it('debería devolver profesores', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: mockTeachers, error: null }),
        })),
      });

      const result = await classesService.getTeachers();

      expect(result).toEqual(mockTeachers);
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('debería lanzar error si falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Error DB') }),
        })),
      });

      await expect(classesService.getTeachers()).rejects.toThrow('Error DB');
    });
  });

  // ────────────────────────────────────────────
  // createClass — injects studio_id from store
  // ────────────────────────────────────────────
  describe('createClass', () => {
    const payload = {
      activity_name: 'Ballet Clásico',
      teacher_id: 'tea-001',
      day_of_week: 1,
      start_time: '10:00',
      end_time: '11:00',
      capacity: 15,
      base_price: 5000,
      teacher_commission_pct: 50,
    };

    it('debería crear una clase con upsert a specialties si tiene activity_name', async () => {
      mockFrom.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      await classesService.createClass(payload);

      expect(mockFrom).toHaveBeenNthCalledWith(1, 'specialties');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'classes');
    });

    it('debería crear una clase sin upsert si no tiene activity_name', async () => {
      const { activity_name: _a, ...payloadWithoutActivity } = payload;

      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      await classesService.createClass(payloadWithoutActivity);

      expect(mockFrom).toHaveBeenCalledTimes(1);
      expect(mockFrom).toHaveBeenCalledWith('classes');
    });

    it('debería continuar incluso si el upsert falla (el error se ignora)', async () => {
      mockFrom.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: new Error('Error en specialties') }),
      });
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      await expect(classesService.createClass(payload)).resolves.toBeUndefined();
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'classes');
    });

    it('debería lanzar error si el insert falla', async () => {
      mockFrom.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: new Error('Error al crear clase') }),
      });

      await expect(classesService.createClass(payload)).rejects.toThrow('Error al crear clase');
    });

    it('debería lanzar error si no hay studio activo', async () => {
      const { useAuthStore } = await import('../store/useAuthStore');
      vi.mocked(useAuthStore.getState).mockReturnValueOnce({ current_studio_id: null } as ReturnType<typeof useAuthStore.getState>);

      await expect(classesService.createClass(payload)).rejects.toThrow('No active studio');
    });
  });

  // ────────────────────────────────────────────
  // getClassById
  // ────────────────────────────────────────────
  describe('getClassById', () => {
    it('debería devolver una clase por ID', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockClasses[0], error: null }),
          })),
        })),
      });

      const result = await classesService.getClassById('cls-001');

      expect(result).toEqual(mockClasses[0]);
      expect(mockFrom).toHaveBeenCalledWith('classes');
    });

    it('debería lanzar error si la clase no existe', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
          })),
        })),
      });

      await expect(classesService.getClassById('cls-999')).rejects.toThrow('Not found');
    });
  });

  // ────────────────────────────────────────────
  // updateClass — injects studio_id from store
  // ────────────────────────────────────────────
  describe('updateClass', () => {
    const payload = {
      activity_name: 'Ballet Avanzado',
      capacity: 20,
    };

    it('debería actualizar una clase con upsert si tiene activity_name', async () => {
      mockFrom.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await classesService.updateClass('cls-001', payload);

      expect(mockFrom).toHaveBeenNthCalledWith(1, 'specialties');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'classes');
    });

    it('debería actualizar sin upsert si no hay activity_name', async () => {
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await classesService.updateClass('cls-001', { capacity: 25 });

      expect(mockFrom).toHaveBeenCalledTimes(1);
      expect(mockFrom).toHaveBeenCalledWith('classes');
    });

    it('debería lanzar error si el update falla', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al actualizar') }),
        })),
      });

      await expect(classesService.updateClass('cls-001', { capacity: 25 })).rejects.toThrow('Error al actualizar');
    });

    it('debería continuar si el upsert de specialties falla (el error se ignora)', async () => {
      mockFrom.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: new Error('Error en specialties') }),
      });
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await expect(classesService.updateClass('cls-001', payload)).resolves.toBeUndefined();
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'classes');
    });

    it('debería lanzar error si no hay studio activo', async () => {
      const { useAuthStore } = await import('../store/useAuthStore');
      vi.mocked(useAuthStore.getState).mockReturnValueOnce({ current_studio_id: null } as ReturnType<typeof useAuthStore.getState>);

      await expect(classesService.updateClass('cls-001', payload)).rejects.toThrow('No active studio');
    });
  });
});
