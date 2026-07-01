import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStudentPlans } from './useStudentPlans';
import type { PlanEntity } from '@/core/types/plans.types';
import type { StudentDashboardData } from '@/core/types/dashboard.types';

const mockGetActivePlans = vi.hoisted(() => vi.fn());
const mockGetStudentDashboardData = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  plansService: {
    getActivePlans: mockGetActivePlans,
  },
  dashboardService: {
    getStudentDashboardData: mockGetStudentDashboardData,
  },
}));

const mockPlans: PlanEntity[] = [
  {
    id: 'plan-001',
    name: 'Plan Básico',
    price: 20000,
    classes_per_week: 2,
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    plan_activities: [],
  },
  {
    id: 'plan-002',
    name: 'Plan Premium',
    price: 35000,
    classes_per_week: 4,
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    plan_activities: [],
  },
];

const mockDashboardWithPlan: StudentDashboardData = {
  activePlan: {
    plan_id: 'plan-002',
    plan_details: 'Plan Premium',
    expiration_date: '2026-07-31',
  },
  nextClass: null,
};

const mockDashboardWithoutPlan: StudentDashboardData = {
  activePlan: null,
  nextClass: null,
};

describe('useStudentPlans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActivePlans.mockResolvedValue(mockPlans);
    mockGetStudentDashboardData.mockResolvedValue(mockDashboardWithPlan);
  });

  it('initializes with empty plans, null activePlanId and loading=true', () => {
    const { result } = renderHook(() => useStudentPlans('student-001'));

    expect(result.current.plans).toEqual([]);
    expect(result.current.activePlanId).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('fetches active plans and detects the active plan for the student', async () => {
    const { result } = renderHook(() => useStudentPlans('student-001'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetActivePlans).toHaveBeenCalled();
    expect(mockGetStudentDashboardData).toHaveBeenCalledWith('student-001');
    expect(result.current.plans).toEqual(mockPlans);
    expect(result.current.activePlanId).toBe('plan-002');
  });

  it('keeps activePlanId null when the student has no active plan', async () => {
    mockGetStudentDashboardData.mockResolvedValue(mockDashboardWithoutPlan);

    const { result } = renderHook(() => useStudentPlans('student-001'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activePlanId).toBeNull();
  });

  it('does not fetch dashboard data when userId is missing', async () => {
    const { result } = renderHook(() => useStudentPlans(undefined));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetActivePlans).toHaveBeenCalled();
    expect(mockGetStudentDashboardData).not.toHaveBeenCalled();
    expect(result.current.activePlanId).toBeNull();
  });

  it('sets loading to false when fetch fails', async () => {
    mockGetActivePlans.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useStudentPlans('student-001'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.plans).toEqual([]);
  });
});
