import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRecordPayment } from './useRecordPayment';
import type { PlanEntity } from '@/core/types/plans.types';
import type { StudentWithPlan } from '@/core/types/finances.types';

const mockUsePaymentCalculation = vi.hoisted(() => vi.fn());
const mockGetStudentsWithPlans = vi.hoisted(() => vi.fn());
const mockGetActivePlans = vi.hoisted(() => vi.fn());
const mockRecordPayment = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockOnClose = vi.hoisted(() => vi.fn());
const mockOnSuccess = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());

vi.mock('./usePaymentCalculation', () => ({
  usePaymentCalculation: mockUsePaymentCalculation,
}));

vi.mock('@/core/services', () => ({
  financesService: {
    getStudentsWithPlans: mockGetStudentsWithPlans,
    recordPayment: mockRecordPayment,
  },
  plansService: {
    getActivePlans: mockGetActivePlans,
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

const mockPlans: PlanEntity[] = [
  { id: 'plan-001', name: 'Plan Mensual', price: 25000, classes_per_week: 3, is_active: true, created_at: '', updated_at: '' },
  { id: 'plan-002', name: 'Plan Premium', price: 35000, classes_per_week: 5, is_active: true, created_at: '', updated_at: '' },
];

const studentWithPlan: StudentWithPlan = {
  id: 'stu-001',
  full_name: 'María García',
  email: 'maria@test.com',
  plan_id: 'plan-001',
  promotion_expiration_date: null,
  promotion_discount_pct: null,
  plans: { id: 'plan-001', name: 'Plan Mensual', price: 25000, classes_per_week: 3 },
};

const studentWithoutPlan: StudentWithPlan = {
  id: 'stu-002',
  full_name: 'Juan Pérez',
  email: 'juan@test.com',
  plan_id: null,
  promotion_expiration_date: null,
  promotion_discount_pct: null,
  plans: null,
};

const mockStudents: StudentWithPlan[] = [studentWithPlan, studentWithoutPlan];

const baseCalculation = {
  proratedBase: 25000,
  promoDiscountAmount: 0,
  cashDiscountAmount: 0,
  lateFeeAmount: 0,
  total: 25000,
  expirationDate: '2026-07-31',
  daysInMonth: 30,
  daysRemaining: 30,
};

describe('useRecordPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-001' });
    mockUsePaymentCalculation.mockReturnValue({
      calculation: baseCalculation,
      loading: false,
      error: null,
      isFirstPayment: false,
    });
    mockGetStudentsWithPlans.mockResolvedValue(mockStudents);
    mockGetActivePlans.mockResolvedValue(mockPlans);
    mockRecordPayment.mockResolvedValue(undefined);
  });

  function renderWithOpen() {
    return renderHook(
      ({ isOpen }: { isOpen: boolean }) =>
        useRecordPayment({ isOpen, onClose: mockOnClose, onSuccess: mockOnSuccess }),
      { initialProps: { isOpen: true } },
    );
  }

  it('loads students and plans when modal opens', async () => {
    renderWithOpen();

    await waitFor(() => {
      expect(mockGetStudentsWithPlans).toHaveBeenCalledWith('studio-001');
    });
    expect(mockGetActivePlans).toHaveBeenCalled();
  });

  it('selects student from search text and clears amount override', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.setAmountOverride('12000');
    });

    act(() => {
      result.current.handleStudentSearch({
        target: { value: 'María García (Plan Mensual)' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.selectedStudentId).toBe('stu-001');
    expect(result.current.amountOverride).toBe('');
  });

  it('shows error when submitting without selected student', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(mockShowError).toHaveBeenCalledWith('Seleccione un alumno.');
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it('submits with planChange payload when new plan is selected', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.setSelectedStudentId('stu-001');
      result.current.setIsPlanChange(true);
      result.current.setNewPlanId('plan-002');
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(mockRecordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        planChange: { newPlanId: 'plan-002', studentId: 'stu-001' },
      }),
    );
    expect(mockShowSuccess).toHaveBeenCalledWith('Pago y cambio de plan registrados con éxito.');
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows error when plan change is enabled but no new plan selected', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.setSelectedStudentId('stu-001');
      result.current.setIsPlanChange(true);
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(mockShowError).toHaveBeenCalledWith('Seleccione el plan.');
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it('uses amount override as final amount', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.setSelectedStudentId('stu-001');
      result.current.setAmountOverride('12000');
    });

    expect(result.current.finalAmount).toBe(12000);
  });

  it('flags isPlanAssignment only when the student has no plan', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.setSelectedStudentId('stu-001');
    });
    expect(result.current.isPlanAssignment).toBe(false);

    act(() => {
      result.current.setSelectedStudentId('stu-002');
    });
    expect(result.current.isPlanAssignment).toBe(true);
  });

  it('resolves selectedPlan from the chosen plan when assigning to a student without plan', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.setSelectedStudentId('stu-002');
      result.current.setNewPlanId('plan-001');
    });

    expect(result.current.isPlanAssignment).toBe(true);
    expect(result.current.selectedPlan?.id).toBe('plan-001');
  });

  it('assigns a plan and records the payment for a student without plan', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.setSelectedStudentId('stu-002');
      result.current.setNewPlanId('plan-001');
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(mockRecordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: 'stu-002',
        plan_id: 'plan-001',
        planChange: { newPlanId: 'plan-001', studentId: 'stu-002' },
      }),
    );
    expect(mockShowSuccess).toHaveBeenCalledWith('Pago registrado y plan asignado con éxito.');
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('blocks submit when assigning a plan without choosing one', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.setSelectedStudentId('stu-002');
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(mockShowError).toHaveBeenCalledWith('Seleccione el plan.');
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it('resets the plan selection when the chosen student changes', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.handleStudentSearch({
        target: { value: 'Juan Pérez (Sin Plan)' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.setNewPlanId('plan-001');
      result.current.setIsPlanChange(true);
    });

    act(() => {
      result.current.handleStudentSearch({
        target: { value: 'María García (Plan Mensual)' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.selectedStudentId).toBe('stu-001');
    expect(result.current.newPlanId).toBe('');
    expect(result.current.isPlanChange).toBe(false);
  });

  it('keeps a stable today value across re-renders', () => {
    const { result, rerender } = renderWithOpen();

    const first = result.current.today;
    expect(first).toBeInstanceOf(Date);

    rerender({ isOpen: true });

    expect(result.current.today).toBe(first);
  });

  it('keeps isAfter10th consistent with the frozen today after re-render', () => {
    const { result, rerender } = renderWithOpen();

    rerender({ isOpen: true });

    expect(result.current.isAfter10th).toBe(result.current.today.getDate() > 10);
  });
});
