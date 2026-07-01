import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecordPaymentModal } from './RecordPaymentModal';
import type { PlanEntity } from '@/core/types/plans.types';

const mockShowError = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockRecordPayment = vi.hoisted(() => vi.fn());
const mockGetStudentsWithPlans = vi.hoisted(() => vi.fn());
const mockUsePaymentCalculation = vi.hoisted(() => vi.fn());

vi.mock('@/core/components/GlobalAlertProvider', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

vi.mock('@/core/store/useAuthStore', () => ({
  useAuthStore: vi.fn(() => ({ current_studio_id: 'studio-001' })),
}));

const mockGetActivePlans = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  financesService: {
    recordPayment: mockRecordPayment,
    getStudentsWithPlans: mockGetStudentsWithPlans,
  },
  plansService: {
    getActivePlans: mockGetActivePlans,
  },
}));

vi.mock('@/core/hooks/usePaymentCalculation', () => ({
  usePaymentCalculation: mockUsePaymentCalculation,
}));

const mockStudents = [
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
  expirationDate: '2024-07-31',
  daysInMonth: 30,
  daysRemaining: 30,
};

describe('RecordPaymentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStudentsWithPlans.mockResolvedValue(mockStudents);
    mockUsePaymentCalculation.mockReturnValue({
      calculation: baseCalculation,
      loading: false,
      error: null,
      isFirstPayment: false,
    });
    mockRecordPayment.mockResolvedValue(undefined);
    mockGetActivePlans.mockResolvedValue(mockPlans);
  });

  const selectStudent = async () => {
    // Wait for async students + plans to load before selecting
    await waitFor(() => {
      const option = document.querySelector('#students-list option');
      expect(option).not.toBeNull();
    });
    const studentInput = screen.getByPlaceholderText('Seleccionar alumno...');
    fireEvent.change(studentInput, {
      target: { value: 'María García (Plan Mensual)' },
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Cambiar plan')).toBeInTheDocument();
    }, { timeout: 3000 });
  };

  const renderModal = () =>
    render(
      <RecordPaymentModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

  it('renderiza selector de cambio de plan', async () => {
    renderModal();
    await selectStudent();
  });

  it('muestra el selector de nuevo plan cuando se activa el cambio de plan', async () => {
    renderModal();
    await selectStudent();

    fireEvent.click(screen.getByLabelText('Cambiar plan'));

    expect(screen.getByLabelText('Nuevo Plan')).toBeInTheDocument();
  });

  it('recalcula el pago con el nuevo plan seleccionado', async () => {
    renderModal();
    await selectStudent();

    fireEvent.click(screen.getByLabelText('Cambiar plan'));

    const newPlanSelect = screen.getByLabelText('Nuevo Plan') as HTMLSelectElement;
    fireEvent.change(newPlanSelect, { target: { value: 'plan-002' } });

    expect(mockUsePaymentCalculation).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: expect.objectContaining({ id: 'plan-002', price: 35000, name: 'Plan Premium' }),
      })
    );
  });

  it('envía el pago con planChange cuando se selecciona un nuevo plan', async () => {
    renderModal();
    await selectStudent();

    fireEvent.click(screen.getByLabelText('Cambiar plan'));

    const newPlanSelect = screen.getByLabelText('Nuevo Plan') as HTMLSelectElement;
    fireEvent.change(newPlanSelect, { target: { value: 'plan-002' } });

    fireEvent.click(screen.getByRole('button', { name: /Registrar Pago/i }));

    await waitFor(() => {
      expect(mockRecordPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          planChange: { newPlanId: 'plan-002', studentId: 'stu-001' },
        })
      );
    });
  });
});
