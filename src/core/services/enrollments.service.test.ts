import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrollmentsService } from './enrollments.service';

// ──────────────────────────────────────────────
// 1. Datos de prueba
// ──────────────────────────────────────────────

const mockPlanWithActivities = {
  id: 'plan-001',
  name: 'Plan Mensual',
  price: 25000,
  classes_per_week: 3,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  plan_activities: [
    { id: 'pa-001', plan_id: 'plan-001', activity_name: 'Boxeo', classes_per_week: 2, created_at: '2024-01-01T00:00:00Z' },
    { id: 'pa-002', plan_id: 'plan-001', activity_name: 'Yoga', classes_per_week: 1, created_at: '2024-01-01T00:00:00Z' },
  ],
};

const mockQuotaMap = (overrides: Record<string, { total: number; consumed: number; remaining: number }> = {}) => ({
  Boxeo: { activity_id: 'pa-001', activity_name: 'Boxeo', total: 8, consumed: 3, remaining: 5, ...overrides.Boxeo },
  Yoga: { activity_id: 'pa-002', activity_name: 'Yoga', total: 4, consumed: 1, remaining: 3, ...overrides.Yoga },
});

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

function mockPaymentCount(count: number) {
  return mockFrom.mockReturnValueOnce({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn().mockResolvedValue({ count, error: null }),
        })),
      })),
    })),
  });
}

// ──────────────────────────────────────────────
// 2. Mock de dependencias
// ──────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

const { mockGetPlanById } = vi.hoisted(() => ({
  mockGetPlanById: vi.fn(),
}));

const { mockGetRemainingQuota } = vi.hoisted(() => ({
  mockGetRemainingQuota: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('./plans.service', () => ({
  plansService: {
    getPlanById: mockGetPlanById,
  },
}));

vi.mock('../utils/quotaTracker', () => ({
  getRemainingQuota: mockGetRemainingQuota,
}));

vi.mock('../store/useAuthStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ current_studio_id: 'studio-001' })),
  },
}));

describe('enrollmentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    mockGetPlanById.mockReset();
    mockGetRemainingQuota.mockReset();
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
  // enrollStudent (per-activity quota enforcement)
  // ────────────────────────────────────────────
  describe('enrollStudent', () => {
    const studentId = 'stu-001';
    const classId = 'cls-001';
    const reservationDate = '2024-06-15';

    function setupQuotaCheck(remainingByActivity: Record<string, number> = {}) {
      mockGetPlanById.mockResolvedValue(mockPlanWithActivities);
      mockGetRemainingQuota.mockResolvedValue(mockQuotaMap({
        Boxeo: { total: 8, consumed: 8 - (remainingByActivity.Boxeo ?? 5), remaining: remainingByActivity.Boxeo ?? 5 },
        Yoga: { total: 4, consumed: 4 - (remainingByActivity.Yoga ?? 3), remaining: remainingByActivity.Yoga ?? 3 },
      }));
    }

    function setupSuccessfulEnrollment(paymentCount: number, activityName = 'Boxeo') {
      // Paso 0: Verificar pago del mes actual
      mockPaymentCount(paymentCount);
      // Paso 1: Obtener perfil con plan
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfileWithPlan, error: null }),
          })),
        })),
      });
      // Paso 2: Plan con actividades + quotaTracker
      setupQuotaCheck();
      return setupClassAndInsert(activityName);
    }

    function setupClassAndInsert(activityName = 'Boxeo', enrolledCount = 3) {
      // Paso 3: Contar inscriptos en la clase
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn().mockResolvedValue({ count: enrolledCount, error: null }),
            })),
          })),
        })),
      });
      // Paso 4: Obtener capacidad y actividad de la clase
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { ...mockClassWithCapacity, activity_name: activityName },
              error: null,
            }),
          })),
        })),
      });
      // Paso 5: Insertar enrollment
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValueOnce({ insert: insertMock });
      return insertMock;
    }

    it('debería inscribir a un alumno exitosamente', async () => {
      const insertMock = setupSuccessfulEnrollment(1);

      await enrollmentsService.enrollStudent(studentId, classId, reservationDate);

      expect(mockGetPlanById).toHaveBeenCalledWith('plan-001');
      expect(mockGetRemainingQuota).toHaveBeenCalled();
      expect(insertMock).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledTimes(5);
      expect(mockFrom).toHaveBeenNthCalledWith(1, 'payments');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'profiles');
      expect(mockFrom).toHaveBeenNthCalledWith(3, 'enrollments');
      expect(mockFrom).toHaveBeenNthCalledWith(4, 'classes');
      expect(mockFrom).toHaveBeenNthCalledWith(5, 'enrollments');
    });

    it('debería lanzar error si falla la consulta del perfil', async () => {
      mockPaymentCount(1);
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
      mockPaymentCount(1);
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

    it('debería lanzar error si no queda cupo para la actividad', async () => {
      mockPaymentCount(1);
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfileWithPlan, error: null }),
          })),
        })),
      });
      setupQuotaCheck({ Boxeo: 0 });
      setupClassAndInsert('Boxeo');

      await expect(enrollmentsService.enrollStudent(studentId, classId, reservationDate)).rejects.toThrow(
        'Límite de cupos de Boxeo excedido'
      );
    });

    it('debería inscribir en actividad con cupo disponible aunque otra esté agotada', async () => {
      setupSuccessfulEnrollment(1, 'Yoga');
      // Override quota so Boxeo is exhausted but Yoga has room
      setupQuotaCheck({ Boxeo: 0, Yoga: 3 });

      await expect(enrollmentsService.enrollStudent(studentId, classId, reservationDate)).resolves.toBeUndefined();
    });

    it('debería lanzar error si la clase está al máximo de capacidad', async () => {
      mockPaymentCount(1);
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfileWithPlan, error: null }),
          })),
        })),
      });
      setupQuotaCheck();
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
            single: vi.fn().mockResolvedValue({
              data: { ...mockClassWithCapacity, activity_name: 'Boxeo' },
              error: null,
            }),
          })),
        })),
      });

      await expect(enrollmentsService.enrollStudent(studentId, classId, reservationDate)).rejects.toThrow(
        'La clase ha alcanzado su capacidad máxima para esa fecha.'
      );
    });

    it('debería incluir plan_id al insertar la inscripción', async () => {
      const insertMock = setupSuccessfulEnrollment(1);

      await enrollmentsService.enrollStudent(studentId, classId, reservationDate);

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          student_id: studentId,
          class_id: classId,
          reservation_date: reservationDate,
          studio_id: 'studio-001',
          plan_id: 'plan-001',
        })
      );
    });

    it('debería dar mensaje especial para error de duplicado (code 23505)', async () => {
      mockPaymentCount(1);
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfileWithPlan, error: null }),
          })),
        })),
      });
      setupQuotaCheck();
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
            single: vi.fn().mockResolvedValue({
              data: { ...mockClassWithCapacity, activity_name: 'Boxeo' },
              error: null,
            }),
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
      mockPaymentCount(1);
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfileWithPlan, error: null }),
          })),
        })),
      });
      setupQuotaCheck();
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
            single: vi.fn().mockResolvedValue({
              data: { ...mockClassWithCapacity, activity_name: 'Boxeo' },
              error: null,
            }),
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
  // grace period payment check
  // ────────────────────────────────────────────
  describe('grace period payment check', () => {
    const studentId = 'stu-001';
    const classId = 'cls-001';
    const reservationDate = '2024-06-15';

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function setupSuccessfulEnrollment(paymentCount: number) {
      mockPaymentCount(paymentCount);
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockProfileWithPlan, error: null }),
          })),
        })),
      });
      mockGetPlanById.mockResolvedValue(mockPlanWithActivities);
      mockGetRemainingQuota.mockResolvedValue(mockQuotaMap());
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            })),
          })),
        })),
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { ...mockClassWithCapacity, activity_name: 'Boxeo' },
              error: null,
            }),
          })),
        })),
      });
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });
    }

    it('allows enrollment on day 1 without current month payment', async () => {
      vi.setSystemTime(new Date(2024, 5, 1));
      setupSuccessfulEnrollment(0);

      await expect(enrollmentsService.enrollStudent(studentId, classId, reservationDate)).resolves.toBeUndefined();
    });

    it('allows enrollment on day 10 without current month payment', async () => {
      vi.setSystemTime(new Date(2024, 5, 10));
      setupSuccessfulEnrollment(0);

      await expect(enrollmentsService.enrollStudent(studentId, classId, reservationDate)).resolves.toBeUndefined();
    });

    it('blocks enrollment on day 11 without current month payment', async () => {
      vi.setSystemTime(new Date(2024, 5, 11));
      mockPaymentCount(0);

      await expect(enrollmentsService.enrollStudent(studentId, classId, reservationDate)).rejects.toThrow(
        'El alumno debe abonar la cuota del mes actual antes de inscribirse.'
      );
    });

    it('allows enrollment after day 10 with current month payment', async () => {
      vi.setSystemTime(new Date(2024, 5, 15));
      setupSuccessfulEnrollment(1);

      await expect(enrollmentsService.enrollStudent(studentId, classId, reservationDate)).resolves.toBeUndefined();
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
