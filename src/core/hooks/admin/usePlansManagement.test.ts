import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlansManagement } from './usePlansManagement';
import type { PlanEntity, CreatePlanDTO, CreatePlanActivityDTO } from '@/core/types/plans.types';
import type { ClassEntity } from '@/core/types/classes.types';

const mockGetPlans = vi.hoisted(() => vi.fn());
const mockGetClasses = vi.hoisted(() => vi.fn());
const mockCreatePlanWithActivities = vi.hoisted(() => vi.fn());
const mockUpdatePlanWithActivities = vi.hoisted(() => vi.fn());
const mockDeletePlan = vi.hoisted(() => vi.fn());
const mockTogglePlanStatus = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  plansService: {
    getPlans: mockGetPlans,
    createPlanWithActivities: mockCreatePlanWithActivities,
    updatePlanWithActivities: mockUpdatePlanWithActivities,
    deletePlan: mockDeletePlan,
    togglePlanStatus: mockTogglePlanStatus,
  },
  classesService: {
    getClasses: mockGetClasses,
  },
}));

vi.mock('@/ui/useAlert', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

vi.mock('@/core/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    (selector?: (state: ReturnType<typeof mockUseAuthStore>) => unknown) => {
      const state = mockUseAuthStore();
      if (typeof selector === 'function') return selector(state);
      return state;
    },
    { getState: () => mockUseAuthStore() },
  ),
}));

const mockPlan: PlanEntity = {
  id: 'plan-001',
  name: 'Plan Mensual',
  price: 25000,
  classes_per_week: 3,
  is_active: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  plan_activities: [],
};

const mockClass: ClassEntity = {
  id: 'class-001',
  activity_name: 'Yoga',
  teacher_id: 'teacher-001',
  day_of_week: 1,
  start_time: '10:00',
  end_time: '11:00',
  capacity: 15,
  base_price: 5000,
  teacher_commission_pct: 50,
  is_active: true,
};

const mockPlanData: CreatePlanDTO = {
  name: 'Plan Nuevo',
  price: 30000,
  classes_per_week: 4,
  is_active: true,
};

const mockActivities: CreatePlanActivityDTO[] = [
  { activity_name: 'Yoga', classes_per_week: 2 },
  { activity_name: 'Pilates', classes_per_week: 2 },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

function flushSettles(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 20);
  });
}

function actWarnings(consoleSpy: { mock: { calls: Array<Array<unknown>> } }): string[] {
  return consoleSpy.mock.calls
    .map((call) => String(call[0]))
    .filter((message) => message.includes('not wrapped in act'));
}

const mockPlanB: PlanEntity = {
  ...mockPlan,
  id: 'plan-002',
  name: 'Plan Trimestral',
};

const mockClassB: ClassEntity = {
  ...mockClass,
  id: 'class-002',
  activity_name: 'Pilates',
};

describe('usePlansManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-001' });
    mockGetPlans.mockResolvedValue([mockPlan]);
    mockGetClasses.mockResolvedValue([mockClass]);
    mockCreatePlanWithActivities.mockResolvedValue({ ...mockPlan, id: 'plan-new' });
    mockUpdatePlanWithActivities.mockResolvedValue(undefined);
    mockDeletePlan.mockResolvedValue(undefined);
    mockTogglePlanStatus.mockResolvedValue(undefined);
  });

  it('initializes with empty state and loading=true', async () => {
    const { result } = renderHook(() => usePlansManagement());

    expect(result.current.plans).toEqual([]);
    expect(result.current.availableClasses).toEqual([]);
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('fetches plans and classes on mount', async () => {
    const { result } = renderHook(() => usePlansManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetPlans).toHaveBeenCalled();
    expect(mockGetClasses).toHaveBeenCalledWith('studio-001');
    expect(result.current.plans).toEqual([mockPlan]);
    expect(result.current.availableClasses).toEqual([mockClass]);
  });

  it('does not fetch when studio id is missing', async () => {
    mockUseAuthStore.mockReturnValue({ current_studio_id: null });

    const { result } = renderHook(() => usePlansManagement());

    expect(result.current.loading).toBe(false);
    expect(mockGetPlans).not.toHaveBeenCalled();
    expect(mockGetClasses).not.toHaveBeenCalled();
  });

  it('createPlan calls service and refreshes plans', async () => {
    const { result } = renderHook(() => usePlansManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let refresh!: Promise<void>;
    await act(async () => {
      refresh = result.current.createPlan(mockPlanData, mockActivities);
    });
    await act(async () => {});
    await refresh;

    expect(mockCreatePlanWithActivities).toHaveBeenCalledWith(mockPlanData, mockActivities);
    expect(mockGetPlans).toHaveBeenCalledTimes(2);
    expect(mockShowSuccess).toHaveBeenCalledWith('Plan creado con éxito.');
  });

  it('updatePlan calls service and refreshes plans', async () => {
    const { result } = renderHook(() => usePlansManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let refresh!: Promise<void>;
    await act(async () => {
      refresh = result.current.updatePlan('plan-001', mockPlanData, mockActivities);
    });
    await act(async () => {});
    await refresh;

    expect(mockUpdatePlanWithActivities).toHaveBeenCalledWith('plan-001', mockPlanData, mockActivities);
    expect(mockGetPlans).toHaveBeenCalledTimes(2);
    expect(mockShowSuccess).toHaveBeenCalledWith('Plan actualizado con éxito.');
  });

  it('deletePlan calls service and refreshes plans', async () => {
    const { result } = renderHook(() => usePlansManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let refresh!: Promise<void>;
    await act(async () => {
      refresh = result.current.deletePlan('plan-001');
    });
    await act(async () => {});
    await refresh;

    expect(mockDeletePlan).toHaveBeenCalledWith('plan-001');
    expect(mockGetPlans).toHaveBeenCalledTimes(2);
    expect(mockShowSuccess).toHaveBeenCalledWith('Plan eliminado con éxito.');
  });

  it('toggleStatus updates plan optimistically and calls service', async () => {
    const { result } = renderHook(() => usePlansManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleStatus('plan-001', true);
    });

    expect(mockTogglePlanStatus).toHaveBeenCalledWith('plan-001', false);
    expect(result.current.plans[0].is_active).toBe(false);
    expect(mockShowSuccess).toHaveBeenCalledWith('Estado actualizado con éxito.');
  });

  it('toggleStatus reverts optimistic update on error', async () => {
    mockTogglePlanStatus.mockRejectedValueOnce(new Error('Update failed'));

    const { result } = renderHook(() => usePlansManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleStatus('plan-001', true);
    });

    expect(mockTogglePlanStatus).toHaveBeenCalledWith('plan-001', false);
    expect(result.current.plans[0].is_active).toBe(true);
    expect(mockShowError).toHaveBeenCalledWith('Error actualizando el estado.');
  });

  it('fetchPlans refreshes plans manually', async () => {
    const { result } = renderHook(() => usePlansManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let refresh!: Promise<void>;
    await act(async () => {
      refresh = result.current.fetchPlans();
    });
    await act(async () => {});
    await refresh;

    expect(mockGetPlans).toHaveBeenCalledTimes(2);
  });

  it('shows error when fetch fails', async () => {
    mockGetPlans.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePlansManagement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockShowError).toHaveBeenCalledWith('Error cargando los planes.');
  });

  it('newest-wins: a stale studio-A response settling late never clobbers newer studio-B data', async () => {
    const plansGateA = deferred<PlanEntity[]>();
    const classesGateA = deferred<ClassEntity[]>();
    const plansGateB = deferred<PlanEntity[]>();
    const classesGateB = deferred<ClassEntity[]>();
    mockGetPlans
      .mockImplementationOnce(() => plansGateA.promise)
      .mockImplementationOnce(() => plansGateB.promise);
    mockGetClasses
      .mockImplementationOnce(() => classesGateA.promise)
      .mockImplementationOnce(() => classesGateB.promise);

    const { result, rerender } = renderHook(() => usePlansManagement());

    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-B' });
    rerender();

    plansGateB.resolve([mockPlanB]);
    classesGateB.resolve([mockClassB]);
    await waitFor(() => expect(result.current.plans).toEqual([mockPlanB]));
    expect(result.current.availableClasses).toEqual([mockClassB]);

    plansGateA.resolve([mockPlan]);
    classesGateA.resolve([mockClass]);
    await flushSettles();

    expect(result.current.plans).toEqual([mockPlanB]);
    expect(result.current.availableClasses).toEqual([mockClassB]);
  });

  it('commits no state after unmount (no act warnings)', async () => {
    const plansGate = deferred<PlanEntity[]>();
    const classesGate = deferred<ClassEntity[]>();
    mockGetPlans.mockImplementationOnce(() => plansGate.promise);
    mockGetClasses.mockImplementationOnce(() => classesGate.promise);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderHook(() => usePlansManagement());
    unmount();

    plansGate.resolve([mockPlan]);
    classesGate.resolve([mockClass]);
    await flushSettles();

    expect(actWarnings(consoleSpy)).toEqual([]);

    consoleSpy.mockRestore();
  });
});
