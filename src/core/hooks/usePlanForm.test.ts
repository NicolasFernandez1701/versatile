import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlanForm } from './usePlanForm';
import type { PlanEntity } from '@/core/types/plans.types';

const mockCreatePlanWithActivities = vi.hoisted(() => vi.fn());
const mockUpdatePlanWithActivities = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockOnSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  plansService: {
    createPlanWithActivities: mockCreatePlanWithActivities,
    updatePlanWithActivities: mockUpdatePlanWithActivities,
  },
}));

vi.mock('@/core/components/GlobalAlertProvider', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

const basePlan: PlanEntity = {
  id: 'plan-001',
  name: 'Plan Mensual',
  price: 25000,
  classes_per_week: 3,
  is_active: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  plan_activities: [
    { id: 'pa-001', plan_id: 'plan-001', activity_name: 'Yoga', classes_per_week: 2, created_at: '' },
    { id: 'pa-002', plan_id: 'plan-001', activity_name: 'Funcional', classes_per_week: 1, created_at: '' },
  ],
};

describe('usePlanForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePlanWithActivities.mockResolvedValue(undefined);
    mockUpdatePlanWithActivities.mockResolvedValue(undefined);
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => usePlanForm());

    expect(result.current.name).toBe('');
    expect(result.current.price).toBe('');
    expect(result.current.classesPerWeek).toBe(0);
    expect(result.current.isActive).toBe(true);
    expect(result.current.activities).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('initializes from initialData', () => {
    const { result } = renderHook(() => usePlanForm({ initialData: basePlan }));

    expect(result.current.name).toBe('Plan Mensual');
    expect(result.current.price).toBe('25000');
    expect(result.current.classesPerWeek).toBe(3);
    expect(result.current.isActive).toBe(true);
    expect(result.current.activities).toHaveLength(2);
    expect(result.current.activities[0].activity_name).toBe('Yoga');
  });

  it('updates scalar fields via setField', () => {
    const { result } = renderHook(() => usePlanForm());

    act(() => {
      result.current.setField('name', 'Plan Premium');
      result.current.setField('price', '30000');
      result.current.setField('classesPerWeek', 5);
      result.current.setField('isActive', false);
    });

    expect(result.current.name).toBe('Plan Premium');
    expect(result.current.price).toBe('30000');
    expect(result.current.classesPerWeek).toBe(5);
    expect(result.current.isActive).toBe(false);
  });

  it('adds and removes activities', () => {
    const { result } = renderHook(() => usePlanForm());

    act(() => {
      result.current.addActivity();
    });

    expect(result.current.activities).toHaveLength(1);
    expect(result.current.activities[0]).toEqual({ activity_name: '', classes_per_week: 1 });

    act(() => {
      result.current.removeActivity(0);
    });

    expect(result.current.activities).toHaveLength(0);
  });

  it('updates an activity field', () => {
    const { result } = renderHook(() => usePlanForm());

    act(() => {
      result.current.addActivity();
      result.current.updateActivity(0, 'activity_name', 'Yoga');
      result.current.updateActivity(0, 'classes_per_week', 3);
    });

    expect(result.current.activities[0]).toEqual({ activity_name: 'Yoga', classes_per_week: 3 });
  });

  it('calculates suggested price from classesPerWeek', () => {
    const { result } = renderHook(() => usePlanForm());

    act(() => {
      result.current.setField('classesPerWeek', 4);
    });

    act(() => {
      result.current.calculateSuggestedPrice();
    });

    expect(result.current.price).toBe('8000');
  });

  it('creates a plan on submit', async () => {
    const { result } = renderHook(() => usePlanForm({ onSuccess: mockOnSuccess }));

    act(() => {
      result.current.setField('name', 'Plan Premium');
      result.current.setField('price', '30000');
      result.current.addActivity();
      result.current.updateActivity(0, 'activity_name', 'Yoga');
      result.current.updateActivity(0, 'classes_per_week', 3);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreatePlanWithActivities).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Plan Premium',
        price: 30000,
        classes_per_week: 3,
        is_active: true,
      }),
      [{ activity_name: 'Yoga', classes_per_week: 3 }],
    );
    expect(mockShowSuccess).toHaveBeenCalledWith('Plan creado con éxito.');
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('updates a plan when initialData is provided', async () => {
    const { result } = renderHook(() => usePlanForm({ initialData: basePlan, onSuccess: mockOnSuccess }));

    act(() => {
      result.current.setField('name', 'Plan Actualizado');
      result.current.setField('price', '28000');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockUpdatePlanWithActivities).toHaveBeenCalledWith(
      'plan-001',
      expect.objectContaining({
        name: 'Plan Actualizado',
        price: 28000,
        classes_per_week: 3,
        is_active: true,
      }),
      [
        { activity_name: 'Yoga', classes_per_week: 2 },
        { activity_name: 'Funcional', classes_per_week: 1 },
      ],
    );
    expect(mockCreatePlanWithActivities).not.toHaveBeenCalled();
    expect(mockShowSuccess).toHaveBeenCalledWith('Plan actualizado con éxito.');
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('does not submit when required fields are empty', async () => {
    const { result } = renderHook(() => usePlanForm());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreatePlanWithActivities).not.toHaveBeenCalled();
    expect(mockUpdatePlanWithActivities).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Completa el nombre, el precio y al menos una actividad válida.');
    expect(result.current.loading).toBe(false);
  });

  it('does not submit when activities are invalid', async () => {
    const { result } = renderHook(() => usePlanForm());

    act(() => {
      result.current.setField('name', 'Plan Sin Actividad');
      result.current.setField('price', '10000');
      result.current.addActivity();
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreatePlanWithActivities).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Completa el nombre, el precio y al menos una actividad válida.');
  });

  it('surfaces service errors and stops loading', async () => {
    mockCreatePlanWithActivities.mockRejectedValueOnce(new Error('Duplicate name'));
    const { result } = renderHook(() => usePlanForm());

    act(() => {
      result.current.setField('name', 'Plan Error');
      result.current.setField('price', '10000');
      result.current.addActivity();
      result.current.updateActivity(0, 'activity_name', 'Yoga');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('Duplicate name');
    expect(mockShowError).toHaveBeenCalledWith('Error: Duplicate name');
    expect(result.current.loading).toBe(false);
  });
});
