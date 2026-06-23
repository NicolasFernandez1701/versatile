import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrollmentsService } from './enrollments.service';

// ──────────────────────────────────────────────
// 1. Datos de prueba
// ──────────────────────────────────────────────

const mockEnrollments: any[] = [
  {
    id: 'enr-001',
    student_id: 'stu-001',
    class_id: 'cls-001',
    reservation_date: '2024-06-15',
    attendance_status: 'confirmed',
    created_at: '2024-06-10T00:00:00Z',
    profiles: { full_name: 'María García', email: 'maria@test.com' },
    classes: { activity_name: 'Ballet', day_of_week: 1, start_time: '10:00' },
  },
];

const mockProfileWithPlan = {
  plan_id: 'plan-001',
  plans: { classes_per_week: 3 },
};

const mockProfileWithoutPlan = {
  plan_id: null,
  plans: null,
};

const mockClassWithCapacity = {
  capacity: 15,
};

// ──────────────────────────────────────────────
// 2. Mock de Supabase
// ──────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { from: mockFrom },
}));

describe('enrollmentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────
  // getEnrollments
  // ────────────────────────────────────────────
  describe('getEnrollments', () => {
    it('debería devolver todas las inscripciones', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: mockEnrollments, error: null }),
        })),
      });

      const result = await enrollmentsService.getEnrollments();

      expect(result).toEqual(mockEnrollments);
      expect(mockFrom).toHaveBeenCalledWith('enrollments');
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('Error DB') }),
        })),
      });

      await expect(enrollmentsService.getEnrollments()).rejects.toThrow('Error DB');
    });
  });

  // ────────────────────────────────────────────
  // enrollStudent (complejo — 7 pasos)
  // ────────────────────────────────────────────
  describe('enrollStudent', () => {
    const studentId = 'stu-001';
    const classId = 'cls-001';
    const reservationDate = '2024-06-15';

    it('debería inscribir a un alumno exitosamente', async () => {
      // Paso 1: Obtener perfil con plan
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfileWithPlan, error: null }),
          })),
        })),
      });
      // Paso 2: Contar reservas del mes (monthlyCount = 5, límite = 12)
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                neq: vi.fn().mockResolvedValue({ count: 5, error: null }),
              })),
            })),
          })),
        })),
      });
      // Paso 3: Contar inscriptos en la clase (enrolledCount = 3, capacity = 15)
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn().mockResolvedValue({ count: 3, error: null }),
            })),
          })),
        })),
      });
      // Paso 4: Obtener capacidad de la clase
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockClassWithCapacity, error: null }),
          })),
        })),
      });
      // Paso 5: Insertar enrollment
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      await enrollmentsService.enrollStudent(studentId, classId, reservationDate);

      expect(mockFrom).toHaveBeenCalledTimes(5);
      expect(mockFrom).toHaveBeenNthCalledWith(1, 'profiles');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'enrollments');
      expect(mockFrom).toHaveBeenNthCalledWith(3, 'enrollments');
      expect(mockFrom).toHaveBeenNthCalledWith(4, 'classes');
      expect(mockFrom).toHaveBeenNthCalledWith(5, 'enrollments');
    });

    it('debería lanzar error si falla la consulta del perfil', async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Perfil no encontrado') }),
          })),
        })),
      });

      await expect(enrollmentsService.enrollStudent(studentId, classId, reservationDate)).rejects.toThrow('Perfil no encontrado');
    });

    it('debería lanzar error si el alumno no tiene plan activo', async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfileWithoutPlan, error: null }),
          })),
        })),
      });

      await expect(enrollmentsService.enrollStudent(studentId, classId, reservationDate)).rejects.toThrow(
        'El alumno no tiene un plan activo asignado.'
      );
    });

    it('debería lanzar error si se excede el límite mensual', async () => {
      // Perfil con plan (classes_per_week = 3 → límite = 12)
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfileWithPlan, error: null }),
          })),
        })),
      });
      // Monthly count = 12, ya igual al límite → error
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                neq: vi.fn().mockResolvedValue({ count: 12, error: null }),
              })),
            })),
          })),
        })),
      });

      await expect(enrollmentsService.enrollStudent(studentId, classId, reservationDate)).rejects.toThrow(
        'Límite mensual excedido'
      );
    });

    it('debería lanzar error si falla el conteo mensual', async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfileWithPlan, error: null }),
          })),
        })),
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                neq: vi.fn().mockResolvedValue({ count: null, error: new Error('Error en conteo mensual') }),
              })),
            })),
          })),
        })),
      });

      await expect(enrollmentsService.enrollStudent(studentId, classId, reservationDate)).rejects.toThrow(
        'Error en conteo mensual'
      );
    });

    it('debería lanzar error si la clase está al máximo de capacidad', async () => {
      // Perfil ok
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfileWithPlan, error: null }),
          })),
        })),
      });
      // Monthly count ok (5 < 12)
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                neq: vi.fn().mockResolvedValue({ count: 5, error: null }),
              })),
            })),
          })),
        })),
      });
      // Enrolled count = 15, capacity = 15 → excedido
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn().mockResolvedValue({ count: 15, error: null }),
            })),
          })),
        })),
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockClassWithCapacity, error: null }),
          })),
        })),
      });

      await expect(enrollmentsService.enrollStudent(studentId, classId, reservationDate)).rejects.toThrow(
        'La clase ha alcanzado su capacidad máxima para esa fecha.'
      );
    });

    it('debería dar mensaje especial para error de duplicado (code 23505)', async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfileWithPlan, error: null }),
          })),
        })),
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                neq: vi.fn().mockResolvedValue({ count: 2, error: null }),
              })),
            })),
          })),
        })),
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn().mockResolvedValue({ count: 1, error: null }),
            })),
          })),
        })),
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockClassWithCapacity, error: null }),
          })),
        })),
      });
      // Insert con error code 23505
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate key value' } }),
      });

      await expect(enrollmentsService.enrollStudent(studentId, classId, reservationDate)).rejects.toThrow(
        'El alumno ya está inscripto en esta clase para ese día.'
      );
    });

    it('debería lanzar error genérico si el insert falla con otro código', async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfileWithPlan, error: null }),
          })),
        })),
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                neq: vi.fn().mockResolvedValue({ count: 2, error: null }),
              })),
            })),
          })),
        })),
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn().mockResolvedValue({ count: 1, error: null }),
            })),
          })),
        })),
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockClassWithCapacity, error: null }),
          })),
        })),
      });
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: new Error('Error de red') }),
      });

      await expect(enrollmentsService.enrollStudent(studentId, classId, reservationDate)).rejects.toThrow('Error de red');
    });
  });

  // ────────────────────────────────────────────
  // unenrollStudent
  // ────────────────────────────────────────────
  describe('unenrollStudent', () => {
    it('debería eliminar una inscripción', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await enrollmentsService.unenrollStudent('enr-001');

      expect(mockFrom).toHaveBeenCalledWith('enrollments');
    });

    it('debería lanzar error si falla', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al eliminar inscripción') }),
        })),
      });

      await expect(enrollmentsService.unenrollStudent('enr-999')).rejects.toThrow('Error al eliminar inscripción');
    });
  });
});
