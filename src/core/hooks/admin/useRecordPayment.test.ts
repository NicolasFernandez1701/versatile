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
const mockShowAlert = vi.hoisted(() => vi.fn());
const mockOnClose = vi.hoisted(() => vi.fn());
const mockOnSuccess = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());

vi.mock('../shared/usePaymentCalculation', () => ({
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
  useAlert: () => ({ showAlert: mockShowAlert, showError: mockShowError, showSuccess: mockShowSuccess }),
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

function createSubmitEvent(): React.FormEvent {
  return { preventDefault: () => {} } as React.FormEvent;
}

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
    mockRecordPayment.mockResolvedValue({ planChangeAudited: true });
  });

  function renderWithOpen() {
    return renderHook(
      ({ isOpen }: { isOpen: boolean }) =>
        useRecordPayment({ isOpen, onClose: mockOnClose, onSuccess: mockOnSuccess }),
      { initialProps: { isOpen: true } },
    );
  }

  it('fetches students and plans when the modal transitions from closed to open', async () => {
    const { result, rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) =>
        useRecordPayment({ isOpen, onClose: mockOnClose, onSuccess: mockOnSuccess }),
      { initialProps: { isOpen: false } },
    );

    // The `enabled: isOpen` gate stays shut while closed: no fetch, empty list.
    expect(result.current.students).toEqual([]);
    expect(mockGetStudentsWithPlans).not.toHaveBeenCalled();
    expect(mockGetActivePlans).not.toHaveBeenCalled();

    rerender({ isOpen: true });

    await waitFor(() => {
      expect(mockGetStudentsWithPlans).toHaveBeenCalledWith('studio-001');
    });
    expect(mockGetActivePlans).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.students).toEqual(mockStudents));
    expect(result.current.availablePlans).toEqual(mockPlans);
  });

  it('selects a student by id and clears the amount override', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.setAmountOverride('12000');
    });

    act(() => {
      result.current.selectStudent('stu-001');
    });

    expect(result.current.selectedStudentId).toBe('stu-001');
    expect(result.current.amountOverride).toBe('');
  });

  it('clears the selection when an empty id is passed', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.selectStudent('stu-001');
    });
    expect(result.current.selectedStudentId).toBe('stu-001');

    act(() => {
      result.current.selectStudent('');
    });

    expect(result.current.selectedStudentId).toBe('');
    expect(result.current.isPlanChange).toBe(false);
    expect(result.current.newPlanId).toBe('');
  });

  it('shows error when submitting without selected student', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    await act(async () => {
      await result.current.handleSubmit(createSubmitEvent());
    });

    expect(mockShowError).toHaveBeenCalledWith('Seleccione un alumno.');
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it('submits with planChange payload when new plan is selected', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.selectStudent('stu-001');
      result.current.setIsPlanChange(true);
      result.current.setNewPlanId('plan-002');
    });

    await act(async () => {
      await result.current.handleSubmit(createSubmitEvent());
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
      result.current.selectStudent('stu-001');
      result.current.setIsPlanChange(true);
    });

    await act(async () => {
      await result.current.handleSubmit(createSubmitEvent());
    });

    expect(mockShowError).toHaveBeenCalledWith('Seleccione el plan.');
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it('uses amount override as final amount', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.selectStudent('stu-001');
      result.current.setAmountOverride('12000');
    });

    expect(result.current.finalAmount).toBe(12000);
  });

  it('flags isPlanAssignment only when the student has no plan', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.selectStudent('stu-001');
    });
    expect(result.current.isPlanAssignment).toBe(false);

    act(() => {
      result.current.selectStudent('stu-002');
    });
    expect(result.current.isPlanAssignment).toBe(true);
  });

  it('resolves selectedPlan from the chosen plan when assigning to a student without plan', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.selectStudent('stu-002');
      result.current.setNewPlanId('plan-001');
    });

    expect(result.current.isPlanAssignment).toBe(true);
    expect(result.current.selectedPlan?.id).toBe('plan-001');
  });

  it('assigns a plan and records the payment for a student without plan', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.selectStudent('stu-002');
      result.current.setNewPlanId('plan-001');
    });

    await act(async () => {
      await result.current.handleSubmit(createSubmitEvent());
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
      result.current.selectStudent('stu-002');
    });

    await act(async () => {
      await result.current.handleSubmit(createSubmitEvent());
    });

    expect(mockShowError).toHaveBeenCalledWith('Seleccione el plan.');
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it('resets the plan selection when a different student is selected', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.selectStudent('stu-002');
    });

    act(() => {
      result.current.setNewPlanId('plan-001');
      result.current.setIsPlanChange(true);
    });

    act(() => {
      result.current.selectStudent('stu-001');
    });

    expect(result.current.selectedStudentId).toBe('stu-001');
    expect(result.current.newPlanId).toBe('');
    expect(result.current.isPlanChange).toBe(false);
  });

  it('keeps the plan selection when the same student is re-selected', async () => {
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.selectStudent('stu-002');
    });

    act(() => {
      result.current.setNewPlanId('plan-001');
      result.current.setIsPlanChange(true);
    });

    act(() => {
      result.current.selectStudent('stu-002');
    });

    expect(result.current.selectedStudentId).toBe('stu-002');
    expect(result.current.newPlanId).toBe('plan-001');
    expect(result.current.isPlanChange).toBe(true);
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

  it('resets the payment fields on the closed->open transition', async () => {
    const { result, rerender } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.selectStudent('stu-001');
      result.current.setPaymentMethod('efectivo');
      result.current.setApplyLateFee(!result.current.isAfter10th);
      result.current.setAmountOverride('12000');
      result.current.setIsPlanChange(true);
      result.current.setNewPlanId('plan-002');
    });

    // The fields really carried non-default values before the reopen.
    expect(result.current.selectedStudentId).toBe('stu-001');
    expect(result.current.paymentMethod).toBe('efectivo');
    expect(result.current.amountOverride).toBe('12000');
    expect(result.current.isPlanChange).toBe(true);
    expect(result.current.newPlanId).toBe('plan-002');

    rerender({ isOpen: false });
    await act(async () => {
      rerender({ isOpen: true });
    });

    expect(result.current.selectedStudentId).toBe('');
    expect(result.current.paymentMethod).toBe('transferencia');
    expect(result.current.applyLateFee).toBe(result.current.isAfter10th);
    expect(result.current.amountOverride).toBe('');
    expect(result.current.isPlanChange).toBe(false);
    expect(result.current.newPlanId).toBe('');
  });

  it('keeps the previously loaded students visible while the reopen fetch is in flight', async () => {
    const { result, rerender } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));
    expect(mockGetStudentsWithPlans).toHaveBeenCalledTimes(1);

    rerender({ isOpen: false });
    expect(result.current.students).toEqual(mockStudents);

    const gate = deferred<StudentWithPlan[]>();
    mockGetStudentsWithPlans.mockReturnValueOnce(gate.promise);

    rerender({ isOpen: true });

    await waitFor(() => expect(mockGetStudentsWithPlans).toHaveBeenCalledTimes(2));
    // Keep-previous-data: the list is never emptied while the fresh fetch runs.
    expect(result.current.students).toEqual(mockStudents);

    await act(async () => {
      gate.resolve(mockStudents);
      await gate.promise;
    });

    expect(result.current.students).toEqual(mockStudents);
  });

  it('refetches the students on a studio change while open without resetting the form', async () => {
    const { result, rerender } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));
    expect(mockGetStudentsWithPlans).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.selectStudent('stu-001');
      result.current.setPaymentMethod('efectivo');
      result.current.setAmountOverride('12000');
    });

    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-002' });
    rerender({ isOpen: true });

    // Declared delta: the studio key change refetches behind the enabled gate...
    await waitFor(() => expect(mockGetStudentsWithPlans).toHaveBeenCalledWith('studio-002'));
    // ...but the removed effect no longer resets the form while the modal stays open.
    expect(result.current.paymentMethod).toBe('efectivo');
    expect(result.current.amountOverride).toBe('12000');
    expect(result.current.selectedStudentId).toBe('stu-001');
  });

  it('logs the fetch failure with console.error and shows no toast', async () => {
    const error = new Error('Network error');
    mockGetStudentsWithPlans.mockRejectedValueOnce(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.availablePlans).toEqual(mockPlans));
    await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(error));

    expect(consoleSpy.mock.calls).toEqual([[error]]);
    expect(mockShowError).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('avisa con una advertencia cuando el plan se asignó pero la auditoría falló', async () => {
    mockRecordPayment.mockResolvedValueOnce({ planChangeAudited: false });
    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    act(() => {
      result.current.selectStudent('stu-002');
      result.current.setNewPlanId('plan-001');
    });

    await act(async () => {
      await result.current.handleSubmit(createSubmitEvent());
    });

    expect(mockShowSuccess).not.toHaveBeenCalled();
    expect(mockShowAlert).toHaveBeenCalledWith(
      'Advertencia',
      expect.stringContaining('auditoría'),
    );
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('expone el error de cálculo de usePaymentCalculation sin tocar su contrato', async () => {
    const calculationError = new Error('No se pudieron obtener los pagos previos');
    mockUsePaymentCalculation.mockReturnValue({
      calculation: null,
      loading: false,
      error: calculationError,
      isFirstPayment: false,
    });

    const { result } = renderWithOpen();

    await waitFor(() => expect(result.current.students).toEqual(mockStudents));

    expect(result.current.calculationError).toBe(calculationError);
  });
});
