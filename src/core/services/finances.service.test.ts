import { describe, it, expect, vi, beforeEach } from 'vitest';
import { financesService } from './finances.service';

// ──────────────────────────────────────────────
// 1. Datos de prueba
// ──────────────────────────────────────────────

const STUDIO_ID = 'studio-001';

const mockPayments: unknown[] = [
  {
    id: 'pay-001',
    student_id: 'stu-001',
    amount: 25000,
    payment_date: '2024-06-01',
    expiration_date: '2024-07-01',
    plan_details: 'Plan Mensual',
    payment_method: 'efectivo',
    original_amount: 25000,
    discount_applied: 0,
    surcharge_applied: 0,
    late_payment: false,
    late_fee_applied: false,
    created_at: '2024-06-01T00:00:00Z',
    profiles: { full_name: 'María García', email: 'maria@test.com' },
  },
];

const mockStudentsWithPlans: unknown[] = [
  {
    id: 'stu-001',
    full_name: 'María García',
    email: 'maria@test.com',
    role: 'student',
    plans: {
      id: 'plan-001',
      name: 'Plan Mensual',
      price: 25000,
      classes_per_week: 3,
    },
  },
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

vi.mock('../store/useAuthStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ current_studio_id: STUDIO_ID, user: { id: 'admin-001' } })),
  },
}));

describe('financesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────
  // getPayments (filtered by studioId)
  // ────────────────────────────────────────────
  describe('getPayments', () => {
    it('debería devolver todos los pagos del studio ordenados', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: mockPayments, error: null }),
          })),
        })),
      });

      const result = await financesService.getPayments(STUDIO_ID);

      expect(result).toEqual(mockPayments);
      expect(mockFrom).toHaveBeenCalledWith('payments');
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: null, error: new Error('Error al obtener pagos') }),
          })),
        })),
      });

      await expect(financesService.getPayments(STUDIO_ID)).rejects.toThrow('Error al obtener pagos');
    });
  });

  // ────────────────────────────────────────────
  // getStudentsWithPlans (filtered by studioId)
  // ────────────────────────────────────────────
  describe('getStudentsWithPlans', () => {
    it('debería devolver alumnos del studio con sus planes', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: mockStudentsWithPlans, error: null }),
          })),
        })),
      });

      const result = await financesService.getStudentsWithPlans(STUDIO_ID);

      expect(result).toEqual(mockStudentsWithPlans);
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Error DB') }),
          })),
        })),
      });

      await expect(financesService.getStudentsWithPlans(STUDIO_ID)).rejects.toThrow('Error DB');
    });
  });

  // ────────────────────────────────────────────
  // hasExistingPayments
  // ────────────────────────────────────────────
  describe('hasExistingPayments', () => {
    it('debería devolver true cuando el alumno tiene pagos previos', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
        })),
      });

      const result = await financesService.hasExistingPayments('stu-001');

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('payments');
    });

    it('debería devolver false cuando el alumno no tiene pagos previos', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        })),
      });

      const result = await financesService.hasExistingPayments('stu-001');

      expect(result).toBe(false);
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: null, error: new Error('Error DB') }),
        })),
      });

      await expect(financesService.hasExistingPayments('stu-001')).rejects.toThrow('Error DB');
    });
  });

  // ────────────────────────────────────────────
  // recordPayment — injects studio_id from store
  // ────────────────────────────────────────────
  describe('recordPayment', () => {
    const payload = {
      student_id: 'stu-001',
    plan_id: 'plan-001',
    amount: 25000,
    expiration_date: '2024-07-01',
    plan_details: 'Plan Mensual',
    payment_method: 'efectivo' as const,
    original_amount: 25000,
    discount_applied: 0,
    surcharge_applied: 0,
    late_payment: false,
    late_fee_applied: false,
    is_first_payment: false,
  };

    it('debería registrar un pago con studio_id y actualizar la fecha de expiración', async () => {
      mockFrom.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'pay-001' }, error: null }),
          })),
        })),
      });
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await financesService.recordPayment(payload);

      expect(mockFrom).toHaveBeenNthCalledWith(1, 'payments');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'profiles');
    });

    it('debería lanzar error si no hay studio activo', async () => {
      const { useAuthStore } = await import('../store/useAuthStore');
      vi.mocked(useAuthStore.getState).mockReturnValueOnce({ current_studio_id: null } as ReturnType<typeof useAuthStore.getState>);

      await expect(financesService.recordPayment(payload)).rejects.toThrow('No active studio');
    });

    it('debería lanzar error si el insert del pago falla', async () => {
      mockFrom.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Error al registrar pago') }),
          })),
        })),
      });

      await expect(financesService.recordPayment(payload)).rejects.toThrow('Error al registrar pago');
    });

    it('debería lanzar error si el update del perfil falla', async () => {
      mockFrom.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'pay-001' }, error: null }),
          })),
        })),
      });
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al actualizar perfil') }),
        })),
      });

      await expect(financesService.recordPayment(payload)).rejects.toThrow('Error al actualizar perfil');
    });

    it('debería registrar el cambio de plan atómicamente junto al pago', async () => {
      const planChangePayload = {
        ...payload,
        planChange: { newPlanId: 'plan-002', studentId: 'stu-001' },
      };
      const paymentId = 'pay-123';

      // 1. Insert payment
      const insertPaymentMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: paymentId }, error: null }),
        })),
      }));
      mockFrom.mockReturnValueOnce({ insert: insertPaymentMock });
      // 2. Fetch old plan from profile
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { plan_id: 'plan-001' }, error: null }),
          })),
        })),
      });
      // 3. Insert plan_changes
      const insertPlanChangeMock = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValueOnce({ insert: insertPlanChangeMock });
      // 4. Update profile plan_id + expiration
      const updateProfileMock = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));
      mockFrom.mockReturnValueOnce({ update: updateProfileMock });

      await financesService.recordPayment(planChangePayload);

      expect(mockFrom).toHaveBeenNthCalledWith(1, 'payments');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'profiles');
      expect(mockFrom).toHaveBeenNthCalledWith(3, 'plan_changes');
      expect(mockFrom).toHaveBeenNthCalledWith(4, 'profiles');
      expect(insertPlanChangeMock).toHaveBeenCalledWith({
        profile_id: 'stu-001',
        old_plan_id: 'plan-001',
        new_plan_id: 'plan-002',
        changed_by: 'admin-001',
        payment_id: paymentId,
      });
      expect(updateProfileMock).toHaveBeenCalledWith({
        plan_expiration_date: payload.expiration_date,
        plan_id: 'plan-002',
      });
    });

    it('no debería registrar cambio de plan si el pago falla', async () => {
      const planChangePayload = {
        ...payload,
        planChange: { newPlanId: 'plan-002', studentId: 'stu-001' },
      };

      mockFrom.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Error al registrar pago') }),
          })),
        })),
      });

      await expect(financesService.recordPayment(planChangePayload)).rejects.toThrow('Error al registrar pago');
      expect(mockFrom).toHaveBeenCalledTimes(1);
      expect(mockFrom).toHaveBeenNthCalledWith(1, 'payments');
    });

    it('debería loguear el error si el cambio de plan falla después del pago', async () => {
      const planChangePayload = {
        ...payload,
        planChange: { newPlanId: 'plan-002', studentId: 'stu-001' },
      };
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // 1. Insert payment
      mockFrom.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'pay-123' }, error: null }),
          })),
        })),
      });
      // 2. Fetch old plan
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { plan_id: 'plan-001' }, error: null }),
          })),
        })),
      });
      // 3. Insert plan_changes fails
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: new Error('Error al registrar cambio de plan') }),
      });
      // 4. Still update profile expiration (without plan_id)
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await expect(financesService.recordPayment(planChangePayload)).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});
