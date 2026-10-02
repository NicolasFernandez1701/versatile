import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { RecordPaymentModal } from './RecordPaymentModal';
import type { PlanEntity } from '@/core/types/plans.types';
import type { StudentWithPlan } from '@/core/types/finances.types';

const mockOnClose = vi.fn();
const mockOnSuccess = vi.fn();
const mockHandleSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

const mockState = vi.hoisted(() => ({
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
    const availablePlans = mockState.emptyPlans ? [] : mockPlans;
    const calculation = mockState.calculationNull ? null : baseCalculation;

    return {
      students: mockStudents,
      studentSearchText: 'María García (Plan Mensual)',
      availablePlans,
      paymentMethod: 'transferencia' as const,
      setPaymentMethod: vi.fn(),
      applyLateFee: false,
      setApplyLateFee: vi.fn(),
      amountOverride: '',
      setAmountOverride: vi.fn(),
      isSubmitting: false,
      isPlanChange,
      setIsPlanChange,
      newPlanId,
      setNewPlanId,
      selectedStudentId: 'stu-001',
      selectedStudent: mockStudents[0],
      currentPlan: mockStudents[0].plans,
      selectedPlan: isPlanChange
        ? mockPlans.find((p) => p.id === newPlanId) || mockStudents[0].plans
        : mockStudents[0].plans,
      promoDiscountPct: 0,
      finalAmount: 25000,
      isAfter10th: false,
      today: new Date(),
      calculation,
      calculationLoading: false,
      calculationError: mockState.calculationError,
      isFirstPayment: false,
      handleStudentSearch: vi.fn(),
      handleSubmit: mockHandleSubmit,
    };
  },
}));

describe('RecordPaymentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.emptyPlans = false;
    mockState.calculationNull = false;
    mockState.calculationError = null;
  });

  const renderModal = () =>
    render(<RecordPaymentModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

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

  it('explica que no hay planes activos cuando la asignación no tiene opciones', () => {
    mockState.emptyPlans = true;
    renderModal();

    fireEvent.click(screen.getByLabelText('Cambiar plan'));

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
