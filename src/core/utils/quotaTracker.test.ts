import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateQuotaPerActivity,
  getRemainingQuota,
  countConsumedByActivity,
} from './quotaTracker';
import type { PlanWithActivities } from '../types/plans.types';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('../services/supabase', () => ({
  supabase: { from: mockFrom },
}));

function buildPlan(activities: { id: string; activity_name: string; classes_per_week: number }[]): PlanWithActivities {
  return {
    id: 'plan-001',
    name: 'Plan Mix',
    price: 25000,
    classes_per_week: activities.reduce((sum, a) => sum + a.classes_per_week, 0),
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    plan_activities: activities.map((a) => ({ ...a, plan_id: 'plan-001', created_at: '2024-01-01T00:00:00Z' })),
  };
}

describe('calculateQuotaPerActivity', () => {
  const plan = buildPlan([
    { id: 'act-001', activity_name: 'Boxeo', classes_per_week: 2 },
    { id: 'act-002', activity_name: 'Yoga', classes_per_week: 1 },
  ]);

  it('returns full quota when daysRemaining equals daysInMonth', () => {
    const result = calculateQuotaPerActivity(plan, 30, 30);

    expect(result.Boxeo.total).toBe(8);
    expect(result.Yoga.total).toBe(4);
    expect(result.Boxeo.remaining).toBe(8);
    expect(result.Yoga.remaining).toBe(4);
  });

  it('prorates quota at mid-month using ceiling', () => {
    const result = calculateQuotaPerActivity(plan, 16, 30);

    expect(result.Boxeo.total).toBe(Math.ceil(8 * 16 / 30));
    expect(result.Yoga.total).toBe(Math.ceil(4 * 16 / 30));
  });

  it('returns minimal quota on the last day of the month', () => {
    const result = calculateQuotaPerActivity(plan, 1, 30);

    expect(result.Boxeo.total).toBe(Math.ceil(8 / 30));
    expect(result.Yoga.total).toBe(Math.ceil(4 / 30));
  });

  it('returns independent totals for each activity', () => {
    const result = calculateQuotaPerActivity(plan, 15, 30);

    expect(result.Boxeo.total).toBe(Math.ceil(8 * 15 / 30));
    expect(result.Yoga.total).toBe(Math.ceil(4 * 15 / 30));
    expect(result.Boxeo.total).not.toBe(result.Yoga.total);
  });

  it('ignores activities not present in the plan', () => {
    const result = calculateQuotaPerActivity(plan, 15, 30);

    expect(result.Spinning).toBeUndefined();
  });
});

describe('countConsumedByActivity', () => {
  it('groups enrollment rows by activity name', () => {
    const rows = [
      { classes: { activity_name: 'Boxeo' } },
      { classes: { activity_name: 'Boxeo' } },
      { classes: { activity_name: 'Yoga' } },
    ];

    const result = countConsumedByActivity(rows);

    expect(result).toEqual({ Boxeo: 2, Yoga: 1 });
  });

  it('ignores rows with missing activity name', () => {
    const rows = [{ classes: { activity_name: 'Boxeo' } }, { classes: null }, { classes: {} }];

    const result = countConsumedByActivity(rows);

    expect(result).toEqual({ Boxeo: 1 });
  });

  it('returns an empty object when there are no rows', () => {
    const result = countConsumedByActivity([]);

    expect(result).toEqual({});
  });
});

describe('getRemainingQuota', () => {
  const studentId = 'stu-001';
  const planId = 'plan-001';
  const plan = buildPlan([{ id: 'act-001', activity_name: 'Boxeo', classes_per_week: 2 }]);

  beforeEach(() => {
    vi.useFakeTimers();
    mockFrom.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reconciles consumed enrollments against prorated quota', async () => {
    vi.setSystemTime(new Date(2024, 5, 15)); // June 15, 2024

    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              neq: vi.fn().mockResolvedValue({
                data: [
                  { classes: { activity_name: 'Boxeo' } },
                  { classes: { activity_name: 'Boxeo' } },
                  { classes: { activity_name: 'Boxeo' } },
                ],
                error: null,
              }),
            })),
          })),
        })),
      })),
    });

    const result = await getRemainingQuota(studentId, planId, plan, new Date(2024, 5, 1), new Date(2024, 5, 30));

    expect(result.Boxeo.total).toBe(Math.ceil(8 * 16 / 30));
    expect(result.Boxeo.consumed).toBe(3);
    expect(result.Boxeo.remaining).toBe(Math.max(0, Math.ceil(8 * 16 / 30) - 3));
  });

  it('sets remaining to 0 when consumed exceeds prorated quota', async () => {
    vi.setSystemTime(new Date(2024, 5, 15));

    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              neq: vi.fn().mockResolvedValue({
                data: Array.from({ length: 20 }, () => ({ classes: { activity_name: 'Boxeo' } })),
                error: null,
              }),
            })),
          })),
        })),
      })),
    });

    const result = await getRemainingQuota(studentId, planId, plan, new Date(2024, 5, 1), new Date(2024, 5, 30));

    expect(result.Boxeo.remaining).toBe(0);
  });

  it('gives full prorated quota for activities with no consumed enrollments', async () => {
    vi.setSystemTime(new Date(2024, 5, 20));

    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              neq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        })),
      })),
    });

    const result = await getRemainingQuota(studentId, planId, plan, new Date(2024, 5, 1), new Date(2024, 5, 30));

    expect(result.Boxeo.consumed).toBe(0);
    expect(result.Boxeo.remaining).toBe(result.Boxeo.total);
  });

  it('throws when the enrollment query fails', async () => {
    vi.setSystemTime(new Date(2024, 5, 15));

    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              neq: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
            })),
          })),
        })),
      })),
    });

    await expect(getRemainingQuota(studentId, planId, plan, new Date(2024, 5, 1), new Date(2024, 5, 30))).rejects.toThrow(
      'DB error'
    );
  });
});
