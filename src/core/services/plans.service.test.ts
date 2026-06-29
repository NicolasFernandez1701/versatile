import { describe, it, expect, vi, beforeEach } from 'vitest';
import { plansService } from './plans.service';
import type { PlanEntity } from '../types/plans.types';

const STUDIO_ID = 'studio-001';

// ──────────────────────────────────────────────
// 1. Datos de prueba
// ──────────────────────────────────────────────

const mockPlan: PlanEntity = {
  id: 'plan-001',
  name: 'Plan Mensual',
  price: 25000,
  classes_per_week: 3,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  plan_activities: [
    { id: 'act-001', plan_id: 'plan-001', activity_name: 'Ballet', classes_per_week: 2, created_at: '2024-01-01T00:00:00Z' },
  ],
};

const mockPlans: PlanEntity[] = [mockPlan];

const mockNewPlan: PlanEntity = {
  id: 'plan-002',
  name: 'Plan Trimestral',
  price: 60000,
  classes_per_week: 4,
  is_active: true,
  created_at: '2024-02-01T00:00:00Z',
  updated_at: '2024-02-01T00:00:00Z',
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

vi.mock('../store/useAuthStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ current_studio_id: STUDIO_ID })),
  },
}));

describe('plansService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────
  // getPlans
  // ────────────────────────────────────────────
  describe('getPlans', () => {
    it('debería devolver todos los planes ordenados', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: mockPlans, error: null }),
        })),
      });

      const result = await plansService.getPlans();

      expect(result).toEqual(mockPlans);
      expect(mockFrom).toHaveBeenCalledWith('plans');
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('Error DB') }),
        })),
      });

      await expect(plansService.getPlans()).rejects.toThrow('Error DB');
    });
  });

  // ────────────────────────────────────────────
  // getActivePlans
  // ────────────────────────────────────────────
  describe('getActivePlans', () => {
    it('debería devolver solo planes activos ordenados por precio', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: mockPlans, error: null }),
          })),
        })),
      });

      const result = await plansService.getActivePlans();

      expect(result).toEqual(mockPlans);
      expect(mockFrom).toHaveBeenCalledWith('plans');
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: null, error: new Error('Error al obtener planes activos') }),
          })),
        })),
      });

      await expect(plansService.getActivePlans()).rejects.toThrow('Error al obtener planes activos');
    });
  });

  // ────────────────────────────────────────────
  // createPlanWithActivities
  // ────────────────────────────────────────────
  describe('createPlanWithActivities', () => {
    const planData = { name: 'Plan Nuevo', price: 30000, classes_per_week: 2 };
    const activities = [{ activity_name: 'Yoga', classes_per_week: 1 }];

    it('debería crear un plan con studio_id y actividades', async () => {
      const insertPlanFn = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockNewPlan, error: null }),
        })),
      }));
      mockFrom.mockReturnValueOnce({ insert: insertPlanFn });
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await plansService.createPlanWithActivities(planData, activities);

      expect(result).toEqual(mockNewPlan);
      expect(insertPlanFn).toHaveBeenCalledWith([{ ...planData, studio_id: STUDIO_ID }]);
      expect(mockFrom).toHaveBeenNthCalledWith(1, 'plans');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'plan_activities');
    });

    it('debería crear un plan sin actividades', async () => {
      mockFrom.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockNewPlan, error: null }),
          })),
        })),
      });

      const result = await plansService.createPlanWithActivities(planData, []);

      expect(result).toEqual(mockNewPlan);
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar error si el insert del plan falla', async () => {
      mockFrom.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Error al crear plan') }),
          })),
        })),
      });

      await expect(plansService.createPlanWithActivities(planData, activities)).rejects.toThrow('Error al crear plan');
    });

    it('debería lanzar error si el insert de actividades falla', async () => {
      mockFrom.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockNewPlan, error: null }),
          })),
        })),
      });
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: new Error('Error al insertar actividades') }),
      });

      await expect(plansService.createPlanWithActivities(planData, activities)).rejects.toThrow('Error al insertar actividades');
    });
  });

  // ────────────────────────────────────────────
  // togglePlanStatus
  // ────────────────────────────────────────────
  describe('togglePlanStatus', () => {
    it('debería cambiar el estado del plan', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await plansService.togglePlanStatus('plan-001', false);

      expect(mockFrom).toHaveBeenCalledWith('plans');
    });

    it('debería lanzar error si el update falla', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al actualizar estado') }),
        })),
      });

      await expect(plansService.togglePlanStatus('plan-001', false)).rejects.toThrow('Error al actualizar estado');
    });
  });

  // ────────────────────────────────────────────
  // deletePlan
  // ────────────────────────────────────────────
  describe('deletePlan', () => {
    it('debería eliminar un plan', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await plansService.deletePlan('plan-001');

      expect(mockFrom).toHaveBeenCalledWith('plans');
    });

    it('debería lanzar error si la eliminación falla', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al eliminar plan') }),
        })),
      });

      await expect(plansService.deletePlan('plan-999')).rejects.toThrow('Error al eliminar plan');
    });
  });

  // ────────────────────────────────────────────
  // getPlanById
  // ────────────────────────────────────────────
  describe('getPlanById', () => {
    it('debería devolver un plan por ID', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockPlan, error: null }),
          })),
        })),
      });

      const result = await plansService.getPlanById('plan-001');

      expect(result).toEqual(mockPlan);
      expect(mockFrom).toHaveBeenCalledWith('plans');
    });

    it('debería lanzar error si no encuentra el plan', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Plan no encontrado') }),
          })),
        })),
      });

      await expect(plansService.getPlanById('plan-999')).rejects.toThrow('Plan no encontrado');
    });
  });

  // ────────────────────────────────────────────
  // updatePlanWithActivities
  // ────────────────────────────────────────────
  describe('updatePlanWithActivities', () => {
    const planData = { name: 'Plan Actualizado', price: 35000, classes_per_week: 4 };
    const activities = [{ activity_name: 'Spinning', classes_per_week: 2 }];

    it('debería actualizar plan, eliminar actividades viejas e insertar nuevas con studio_id', async () => {
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });
      mockFrom.mockReturnValueOnce({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });
      const insertFn = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValueOnce({ insert: insertFn });

      await plansService.updatePlanWithActivities('plan-001', planData, activities);

      expect(insertFn).toHaveBeenCalledWith([
        expect.objectContaining({ plan_id: 'plan-001', studio_id: STUDIO_ID }),
      ]);
      expect(mockFrom).toHaveBeenNthCalledWith(1, 'plans');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'plan_activities');
      expect(mockFrom).toHaveBeenNthCalledWith(3, 'plan_activities');
    });

    it('debería actualizar sin insertar actividades si el array está vacío', async () => {
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });
      mockFrom.mockReturnValueOnce({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await plansService.updatePlanWithActivities('plan-001', planData, []);

      expect(mockFrom).toHaveBeenCalledTimes(2);
    });

    it('debería lanzar error si el update del plan falla', async () => {
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al actualizar plan') }),
        })),
      });

      await expect(plansService.updatePlanWithActivities('plan-001', planData, activities)).rejects.toThrow('Error al actualizar plan');
    });

    it('debería lanzar error si el delete de actividades falla', async () => {
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });
      mockFrom.mockReturnValueOnce({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al eliminar actividades') }),
        })),
      });

      await expect(plansService.updatePlanWithActivities('plan-001', planData, activities)).rejects.toThrow('Error al eliminar actividades');
    });

    it('debería lanzar error si el insert de actividades falla', async () => {
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });
      mockFrom.mockReturnValueOnce({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: new Error('Error al insertar actividades') }),
      });

      await expect(plansService.updatePlanWithActivities('plan-001', planData, activities)).rejects.toThrow('Error al insertar actividades');
    });
  });
});
