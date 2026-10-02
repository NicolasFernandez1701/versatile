import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { RecordPaymentModal } from './RecordPaymentModal';
import type { PlanEntity } from '@/core/types/plans.types';
import type { StudentWithPlan } from '@/core/types/finances.types';

const mockOnClose = vi.fn();
const mockOnSuccess = vi.fn();
const mockHandleSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
const mockSelectStudent = vi.fn();

// Lets each test decide whether the selected student already owns a plan.
const mockState = vi.hoisted(() => ({
  hasPlan: true,
  emptyPlans: false,
  calculationNull: false,
  calculationError: null as Error | null,
}));

const mockStudents: StudentWithPlan[] = [
  {
    id: 'stu-001',
    full_name: 'María García',
    email: 'maria@test.com',
    plan_id: 'plan-001',
    plans: {
      id: 'plan-001',
      name: 'Plan Mensual',
      price: 25000,
      classes_per_week: 3,
    },
    promotion_expiration_date: null,
    promotion_discount_pct: null,
  },
  {
    id: 'stu-002',
    full_name: 'Juan Pérez',
    email: 'juan@test.com',
    plan_id: null,
    plans: null,
    promotion_expiration_date: null,
    promotion_discount_pct: null,
  },
];

const mockPlans: PlanEntity[] = [
  { id: 'plan-001', name: 'Plan Mensual', price: 25000, classes_per_week: 3, is_active: true, created_at: '', updated_at: '' },
  { id: 'plan-002', name: 'Plan Premium', price: 35000, classes_per_week: 5, is_active: true, created_at: '', updated_at: '' },
];

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

vi.mock('@/core/hooks/admin/useRecordPayment', () => ({
  useRecordPayment: () => {
    const [isPlanChange, setIsPlanChange] = useState(false);
    const [newPlanId, setNewPlanId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('stu-001');

    const currentPlan = mockState.hasPlan ? mockStudents[0].plans : null;
    const isPlanAssignment = !currentPlan;
    const availablePlans = mockState.emptyPlans ? [] : mockPlans;
    const calculation = mockState.calculationNull ? null : baseCalculation;

    const selectStudent = (studentId: string) => {
      mockSelectStudent(studentId);
      setSelectedStudentId(studentId);
    };

    return {
      students: mockStudents,
      selectedStudentId,
      selectStudent,
      availablePlans,
      paymentMethod: 'transferencia' as const,
      setPaymentMethod: vi.fn(),
      applyLateFee: false,
      setApplyLateFee: vi.fn(),
      amountOverride: '',
      setAmountOverride: vi.fn(),
      isSubmitting: false,
      isPlanChange,
      isPlanAssignment,
      setIsPlanChange,
      newPlanId,
      setNewPlanId,
      selectedStudent: mockStudents[0],
      currentPlan,
      selectedPlan:
        isPlanChange || isPlanAssignment
          ? mockPlans.find((p) => p.id === newPlanId) || currentPlan
          : currentPlan,
      promoDiscountPct: 0,
      finalAmount: 25000,
      isAfter10th: false,
      today: new Date(),
      calculation,
      calculationLoading: false,
      calculationError: mockState.calculationError,
      isFirstPayment: false,
      handleSubmit: mockHandleSubmit,
    };
  },
}));

describe('RecordPaymentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.hasPlan = true;
    mockState.emptyPlans = false;
    mockState.calculationNull = false;
    mockState.calculationError = null;
  });

  const renderModal = () =>
    render(<RecordPaymentModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

  it('renderiza una opción por alumno más el placeholder y no la reduce al seleccionar', () => {
    renderModal();

    const studentSelect = screen.getByLabelText('Alumno') as HTMLSelectElement;

    // Placeholder + one option per student. jsdom cannot reproduce the browser-side
    // datalist filtering that hid every other student, so the option count is the
    // honest proxy: a native <select> always keeps every option present.
    expect(studentSelect.options).toHaveLength(mockStudents.length + 1);
    expect(studentSelect.options[0]).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Seleccionar alumno...' })).toBeInTheDocument();
    mockStudents.forEach((student) => {
      const label = `${student.full_name} ${student.plans ? `(${student.plans.name})` : '(Sin Plan)'}`;
      expect(screen.getByRole('option', { name: label })).toBeInTheDocument();
    });

    fireEvent.change(studentSelect, { target: { value: 'stu-002' } });

    expect(studentSelect).toHaveValue('stu-002');
    expect(studentSelect.options).toHaveLength(mockStudents.length + 1);
    expect(screen.getByRole('option', { name: 'María García (Plan Mensual)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Juan Pérez (Sin Plan)' })).toBeInTheDocument();
  });

  it('llama a selectStudent con el id al elegir otro alumno', () => {
    renderModal();

    fireEvent.change(screen.getByLabelText('Alumno'), { target: { value: 'stu-002' } });

    expect(mockSelectStudent).toHaveBeenCalledWith('stu-002');
  });

  it('renderiza selector de cambio de plan', async () => {
    renderModal();

    expect(screen.getByLabelText('Cambiar plan')).toBeInTheDocument();
  });

  it('muestra el selector de nuevo plan cuando se activa el cambio de plan', async () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('Cambiar plan'));

    expect(screen.getByLabelText('Nuevo Plan')).toBeInTheDocument();
  });

  it('permite seleccionar un nuevo plan', async () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('Cambiar plan'));

    const newPlanSelect = screen.getByLabelText('Nuevo Plan') as HTMLSelectElement;
    fireEvent.change(newPlanSelect, { target: { value: 'plan-002' } });

    expect(newPlanSelect.value).toBe('plan-002');
  });

  it('envía el formulario al hacer clic en Registrar Pago', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Registrar Pago/i }));

    await waitFor(() => {
      expect(mockHandleSubmit).toHaveBeenCalled();
    });
  });

  it('muestra el selector de plan para un alumno sin plan y oculta el de cambio', () => {
    mockState.hasPlan = false;
    renderModal();

    expect(screen.getByLabelText('Plan a Asignar')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cambiar plan')).not.toBeInTheDocument();
    expect(
      screen.getByText('El alumno no tiene plan. Asigná uno para registrar el cobro.'),
    ).toBeInTheDocument();
  });

  it('deshabilita Registrar Pago hasta elegir un plan en una asignación', async () => {
    mockState.hasPlan = false;
    renderModal();

    expect(screen.getByRole('button', { name: /Registrar Pago/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Plan a Asignar'), {
      target: { value: 'plan-001' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Registrar Pago/i })).toBeEnabled();
    });
  });

  it('explica que no hay planes activos cuando la asignación no tiene opciones', () => {
    mockState.hasPlan = false;
    mockState.emptyPlans = true;
    renderModal();

    expect(
      screen.getByText(
        'No hay planes activos en este estudio. Creá o activá un plan en Planes antes de registrar el cobro.',
      ),
    ).toBeInTheDocument();
  });

  it('muestra el error de cálculo cuando hay alumno y plan pero no se puede calcular', () => {
    mockState.calculationNull = true;
    mockState.calculationError = new Error('No se pudieron obtener los pagos previos');
    renderModal();

    expect(
      screen.getByText(/No se pudo calcular el cobro: No se pudieron obtener los pagos previos/),
    ).toBeInTheDocument();
  });
});
