import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanForm } from './PlanForm';
import type { ClassEntity } from '@/core/types/classes.types';
import type { PlanEntity } from '@/core/types/plans.types';

const mockShowError = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockCreatePlanWithActivities = vi.hoisted(() => vi.fn());
const mockUpdatePlanWithActivities = vi.hoisted(() => vi.fn());
const mockOnSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/core/components/GlobalAlertProvider', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

vi.mock('@/core/services', () => ({
  plansService: {
    createPlanWithActivities: mockCreatePlanWithActivities,
    updatePlanWithActivities: mockUpdatePlanWithActivities,
  },
}));

const mockClasses = [
  {
    id: 'c1',
    activity_name: 'Yoga',
    base_price: 5000,
  },
  {
    id: 'c2',
    activity_name: 'Funcional',
    base_price: 4000,
  },
] as ClassEntity[];

const mockInitialData: PlanEntity = {
  id: 'plan-1',
  name: 'Plan Premium',
  price: 25000,
  classes_per_week: 4,
  is_active: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  plan_activities: [
    {
      id: 'pa-1',
      plan_id: 'plan-1',
      activity_name: 'Yoga',
      classes_per_week: 2,
      created_at: '2024-01-01',
    },
    {
      id: 'pa-2',
      plan_id: 'plan-1',
      activity_name: 'Funcional',
      classes_per_week: 2,
      created_at: '2024-01-01',
    },
  ],
};

describe('PlanForm', () => {
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePlanWithActivities.mockResolvedValue(undefined);
    mockUpdatePlanWithActivities.mockResolvedValue(undefined);
  });

  const renderForm = (overrides: Partial<{
    initialData?: PlanEntity | null;
    availableClasses: ClassEntity[];
    onSuccess: () => void;
    onCancel: () => void;
  }> = {}) => {
    const props = {
      availableClasses: mockClasses,
      onSuccess: mockOnSuccess,
      onCancel: mockOnCancel,
      ...overrides,
    };
    return render(<PlanForm {...props} />);
  };

  const getForm = () => document.querySelector('form') as HTMLFormElement;

  it('Renderiza form vacío con nombre, precio, isActive checkbox', () => {
    renderForm();

    expect(
      screen.getByPlaceholderText('Ej: Intermedio A')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Valor final del plan')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Plan Activo')).toBeChecked();
    expect(
      screen.getByRole('button', { name: 'Guardar Plan' })
    ).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('Render con initialData: precarga datos y activities', async () => {
    renderForm({ initialData: mockInitialData });

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Ej: Intermedio A')
      ).toHaveValue('Plan Premium');
    });

    expect(screen.getByPlaceholderText('Valor final del plan')).toHaveValue('25000');
    expect(screen.getByLabelText('Plan Activo')).toBeChecked();

    expect(screen.getByDisplayValue('Yoga')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Funcional')).toBeInTheDocument();
  });

  it('Agregar actividad: botón "Agregar Actividad" añade una fila', () => {
    renderForm();

    expect(screen.queryByText('clases/sem')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Agregar Actividad'));

    expect(screen.getByText('clases/sem')).toBeInTheDocument();
    expect(document.querySelectorAll('.activity-row')).toHaveLength(1);
  });

  it('Eliminar actividad: botón Trash2 elimina la fila', () => {
    renderForm();

    fireEvent.click(screen.getByText('Agregar Actividad'));
    expect(screen.getByText('clases/sem')).toBeInTheDocument();

    const trashBtn = document.querySelector('.icon-btn.text-danger') as HTMLElement;
    expect(trashBtn).toBeInTheDocument();
    fireEvent.click(trashBtn);

    expect(screen.queryByText('clases/sem')).not.toBeInTheDocument();
  });

  it('Calcular precio sugerido: clases por semana x $2000', () => {
    renderForm();

    fireEvent.click(screen.getByText('Agregar Actividad'));
    const activityInput = document.querySelector(
      '.activity-row input[type="text"]'
    ) as HTMLInputElement;
    fireEvent.change(activityInput, { target: { value: 'Yoga' } });

    const cpwInput = document.querySelector(
      '.activity-row input[type="number"]'
    ) as HTMLInputElement;
    fireEvent.change(cpwInput, { target: { value: 2 } });

    fireEvent.click(screen.getByText('Agregar Actividad'));

    const inputs = document.querySelectorAll('.activity-row input[type="number"]');
    fireEvent.change(inputs[1], { target: { value: 1 } });

    const calcBtn = screen.getByTitle('Calcular Sugerido');
    fireEvent.click(calcBtn);

    const expectedPrice = 3 * 2000; // 6000
    expect(
      screen.getByPlaceholderText('Valor final del plan')
    ).toHaveValue(expectedPrice.toString());
  });

  it('Submit con datos válidos: crea un plan y llama a onSuccess', async () => {
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('Ej: Intermedio A'), {
      target: { value: 'Plan Avanzado' },
    });

    fireEvent.click(screen.getByText('Agregar Actividad'));

    const activityInput = document.querySelector(
      '.activity-row input[type="text"]'
    ) as HTMLInputElement;
    fireEvent.change(activityInput, { target: { value: 'Yoga' } });

    const cpwInput = document.querySelector(
      '.activity-row input[type="number"]'
    ) as HTMLInputElement;
    fireEvent.change(cpwInput, { target: { value: 2 } });

    fireEvent.change(screen.getByPlaceholderText('Valor final del plan'), {
      target: { value: '15000' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Plan' }));

    await waitFor(() => {
      expect(mockCreatePlanWithActivities).toHaveBeenCalledWith(
        {
          name: 'Plan Avanzado',
          price: 15000,
          classes_per_week: 2,
          is_active: true,
        },
        [{ activity_name: 'Yoga', classes_per_week: 2 }]
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('Submit con initialData actualiza el plan', async () => {
    renderForm({ initialData: mockInitialData });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ej: Intermedio A')).toHaveValue('Plan Premium');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Plan' }));

    await waitFor(() => {
      expect(mockUpdatePlanWithActivities).toHaveBeenCalledWith(
        'plan-1',
        expect.objectContaining({
          name: 'Plan Premium',
          price: 25000,
          classes_per_week: 4,
          is_active: true,
        }),
        [
          { activity_name: 'Yoga', classes_per_week: 2 },
          { activity_name: 'Funcional', classes_per_week: 2 },
        ]
      );
      expect(mockCreatePlanWithActivities).not.toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('Submit sin actividades: muestra error via showError', async () => {
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('Ej: Intermedio A'), {
      target: { value: 'Plan Vacío' },
    });
    fireEvent.change(screen.getByPlaceholderText('Valor final del plan'), {
      target: { value: '10000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Plan' }));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it('Submit sin nombre: muestra error', async () => {
    renderForm();

    fireEvent.click(screen.getByText('Agregar Actividad'));

    const activityInput = document.querySelector(
      '.activity-row input[type="text"]'
    ) as HTMLInputElement;
    fireEvent.change(activityInput, { target: { value: 'Yoga' } });

    fireEvent.change(screen.getByPlaceholderText('Valor final del plan'), {
      target: { value: '15000' },
    });

    fireEvent.submit(getForm());

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it('onCancel llama a la prop onCancel', () => {
    renderForm();

    fireEvent.click(screen.getByText('Cancelar'));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
