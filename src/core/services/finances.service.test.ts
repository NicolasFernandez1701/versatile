import { describe, it, expect, vi, beforeEach } from 'vitest';
import { financesService } from './finances.service';

// ──────────────────────────────────────────────
// 1. Datos de prueba
// ──────────────────────────────────────────────

const mockPayments: any[] = [
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

const mockStudentsWithPlans: any[] = [
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

describe('financesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────
  // getPayments
  // ────────────────────────────────────────────
  describe('getPayments', () => {
    it('debería devolver todos los pagos ordenados', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: mockPayments, error: null }),
        })),
      });

      const result = await financesService.getPayments();

      expect(result).toEqual(mockPayments);
      expect(mockFrom).toHaveBeenCalledWith('payments');
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('Error al obtener pagos') }),
        })),
      });

      await expect(financesService.getPayments()).rejects.toThrow('Error al obtener pagos');
    });
  });

  // ────────────────────────────────────────────
  // getStudentsWithPlans
  // ────────────────────────────────────────────
  describe('getStudentsWithPlans', () => {
    it('debería devolver alumnos con sus planes', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: mockStudentsWithPlans, error: null }),
        })),
      });

      const result = await financesService.getStudentsWithPlans();

      expect(result).toEqual(mockStudentsWithPlans);
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Error DB') }),
        })),
      });

      await expect(financesService.getStudentsWithPlans()).rejects.toThrow('Error DB');
    });
  });

  // ────────────────────────────────────────────
  // recordPayment (insert + update)
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
    };

    it('debería registrar un pago y actualizar la fecha de expiración', async () => {
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
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

    it('debería lanzar error si el insert del pago falla', async () => {
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: new Error('Error al registrar pago') }),
      });

      await expect(financesService.recordPayment(payload)).rejects.toThrow('Error al registrar pago');
    });

    it('debería lanzar error si el update del perfil falla', async () => {
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al actualizar perfil') }),
        })),
      });

      await expect(financesService.recordPayment(payload)).rejects.toThrow('Error al actualizar perfil');
    });
  });
});
