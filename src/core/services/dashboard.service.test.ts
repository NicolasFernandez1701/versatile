import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dashboardService } from './dashboard.service';

// ──────────────────────────────────────────────
// 1. Datos de prueba
// ──────────────────────────────────────────────

const mockFinancialData = {
  monthlyTotal: '250000',
  annualTotal: '3000000',
  monthlyByPlan: { 'Plan Mensual': '150000', 'Plan Premium': '100000' },
  annualByPlan: { 'Plan Mensual': '1800000', 'Plan Premium': '1200000' },
};

const mockFinancialDataParsed = {
  monthlyTotal: 250000,
  annualTotal: 3000000,
  monthlyByPlan: { 'Plan Mensual': 150000, 'Plan Premium': 100000 },
  annualByPlan: { 'Plan Mensual': 1800000, 'Plan Premium': 1200000 },
};

const mockTodayClasses: any[] = [
  {
    id: 'cls-001',
    activity_name: 'Ballet',
    day_of_week: new Date().getDay(),
    start_time: '10:00',
    end_time: '11:00',
    teacher_id: 'tea-001',
    capacity: 15,
    base_price: 5000,
    teacher_commission_pct: 50,
    is_active: true,
    profiles: { full_name: 'Laura Martínez' },
  },
];

const mockActivePlan = {
  plan_id: 'plan-001',
  plan_details: 'Plan Mensual',
  expiration_date: '2024-07-01',
};

const mockNextClass = {
  reservation_date: '2024-06-20',
  classes: { activity_name: 'Ballet', start_time: '10:00', end_time: '11:00' },
};

// ──────────────────────────────────────────────
// 2. Mock de Supabase (from + rpc)
// ──────────────────────────────────────────────

const { mockFrom, mockRpc } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockFrom = vi.fn();
  return { mockFrom, mockRpc };
});

vi.mock('./supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────
  // getDashboardStats (Promise.all con count queries)
  // ────────────────────────────────────────────
  describe('getDashboardStats', () => {
    it('debería devolver estadísticas con ambos contadores', async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: 25, error: null }),
        })),
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
        })),
      });

      const result = await dashboardService.getDashboardStats();

      expect(result).toEqual({ totalStudents: 25, activeClasses: 10 });
      expect(mockFrom).toHaveBeenNthCalledWith(1, 'profiles');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'classes');
    });

    it('debería usar 0 como fallback si count es null', async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: null, error: null }),
        })),
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: null, error: null }),
        })),
      });

      const result = await dashboardService.getDashboardStats();

      expect(result).toEqual({ totalStudents: 0, activeClasses: 0 });
    });

    it('debería lanzar error si la query de students falla', async () => {
      // Promise.all requiere mock para AMBAS queries
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: null, error: new Error('Error DB students') }),
        })),
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        })),
      });

      await expect(dashboardService.getDashboardStats()).rejects.toThrow('Error DB students');
    });

    it('debería lanzar error si la query de classes falla', async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: 25, error: null }),
        })),
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: null, error: new Error('Error DB classes') }),
        })),
      });

      await expect(dashboardService.getDashboardStats()).rejects.toThrow('Error DB classes');
    });
  });

  // ────────────────────────────────────────────
  // getFinancialBalance (RPC + parseo de números)
  // ────────────────────────────────────────────
  describe('getFinancialBalance', () => {
    it('debería obtener y parsear el balance financiero', async () => {
      mockRpc.mockResolvedValue({ data: mockFinancialData, error: null });

      const result = await dashboardService.getFinancialBalance();

      expect(result).toEqual(mockFinancialDataParsed);
      expect(mockRpc).toHaveBeenCalledWith('get_financial_balance', {
        query_year: new Date().getFullYear(),
        query_month: new Date().getMonth() + 1,
      });
    });

    it('debería convertir valores string a number correctamente', async () => {
      mockRpc.mockResolvedValue({ data: mockFinancialData, error: null });

      const result = await dashboardService.getFinancialBalance();

      expect(typeof result.monthlyTotal).toBe('number');
      expect(typeof result.annualTotal).toBe('number');
      expect(typeof result.monthlyByPlan['Plan Mensual']).toBe('number');
      expect(typeof result.annualByPlan['Plan Mensual']).toBe('number');
    });

    it('debería usar 0 si los campos son null/undefined', async () => {
      mockRpc.mockResolvedValue({
        data: { monthlyTotal: null, annualTotal: null, monthlyByPlan: null, annualByPlan: null },
        error: null,
      });

      const result = await dashboardService.getFinancialBalance();

      expect(result).toEqual({
        monthlyTotal: 0,
        annualTotal: 0,
        monthlyByPlan: {},
        annualByPlan: {},
      });
    });

    it('debería lanzar error si el RPC falla', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('Error RPC') });

      await expect(dashboardService.getFinancialBalance()).rejects.toThrow('Error RPC');
    });
  });

  // ────────────────────────────────────────────
  // getTodayClasses
  // ────────────────────────────────────────────
  describe('getTodayClasses', () => {
    it('debería devolver las clases del día actual', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: mockTodayClasses, error: null });

      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: mockOrder,
            })),
          })),
        })),
      });

      const result = await dashboardService.getTodayClasses();

      expect(result).toEqual(mockTodayClasses);
      expect(mockFrom).toHaveBeenCalledWith('classes');
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: null, error: new Error('Error al obtener clases') }),
            })),
          })),
        })),
      });

      await expect(dashboardService.getTodayClasses()).rejects.toThrow('Error al obtener clases');
    });
  });

  // ────────────────────────────────────────────
  // getStudentDashboardData (Promise.all con queries complejas)
  // ────────────────────────────────────────────
  describe('getStudentDashboardData', () => {
    const studentId = 'stu-001';

    it('debería devolver el plan activo y la próxima clase', async () => {
      // Payments query: select().eq().gte().order().limit()
      const mockPaymentsOrder = vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ data: [mockActivePlan], error: null }),
      }));

      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: mockPaymentsOrder,
            })),
          })),
        })),
      });

      // Enrollments query: select().eq().gte().order().limit()
      const mockEnrollmentsOrder = vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ data: [mockNextClass], error: null }),
      }));

      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: mockEnrollmentsOrder,
            })),
          })),
        })),
      });

      const result = await dashboardService.getStudentDashboardData(studentId);

      expect(result).toEqual({
        activePlan: mockActivePlan,
        nextClass: mockNextClass,
      });
      expect(mockFrom).toHaveBeenNthCalledWith(1, 'payments');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'enrollments');
    });

    it('debería devolver null si no hay plan activo ni próxima clase', async () => {
      // Payments query returns empty array
      const mockPaymentsOrder = vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));

      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: mockPaymentsOrder,
            })),
          })),
        })),
      });

      // Enrollments query returns empty array
      const mockEnrollmentsOrder = vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));

      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: mockEnrollmentsOrder,
            })),
          })),
        })),
      });

      const result = await dashboardService.getStudentDashboardData(studentId);

      expect(result).toEqual({
        activePlan: null,
        nextClass: null,
      });
    });

    it('debería lanzar error si la query de payments falla', async () => {
      // Promise.all requiere mock para AMBAS queries
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: null, error: new Error('Error en payments') }),
              })),
            })),
          })),
        })),
      });
      // Mock para enrollments (debe ser válido para no interferir)
      const mockEnrollmentsOrder = vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: mockEnrollmentsOrder,
            })),
          })),
        })),
      });

      await expect(dashboardService.getStudentDashboardData(studentId)).rejects.toThrow('Error en payments');
    });

    it('debería lanzar error si la query de enrollments falla', async () => {
      const mockPaymentsOrder = vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ data: [mockActivePlan], error: null }),
      }));

      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: mockPaymentsOrder,
            })),
          })),
        })),
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: null, error: new Error('Error en enrollments') }),
              })),
            })),
          })),
        })),
      });

      await expect(dashboardService.getStudentDashboardData(studentId)).rejects.toThrow('Error en enrollments');
    });
  });
});
