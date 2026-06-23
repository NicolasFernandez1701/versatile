import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanForm } from './PlanForm';
import type { ClassEntity } from '@/core/types/classes.types';
import type { PlanEntity } from '@/core/types/plans.types';

const mockShowError = vi.hoisted(() => vi.fn());
vi.mock('@/core/components/GlobalAlertProvider', () => ({
  useAlert: () => ({ showError: mockShowError }),
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
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = (overrides: Partial<{
    initialData?: PlanEntity | null;
    availableClasses: ClassEntity[];
    onSubmit: (
      data: { name: string; price: number; classes_per_week: number; is_active: boolean },
      activities: { activity_name: string; classes_per_week: number }[]
    ) => Promise<void>;
    onCancel: () => void;
    loading?: boolean;
  }> = {}) => {
    const props = {
      availableClasses: mockClasses,
      onSubmit: mockOnSubmit,
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

    await vi.waitFor(() => {
      expect(
        screen.getByPlaceholderText('Ej: Intermedio A')
      ).toHaveValue('Plan Premium');
    });

    expect(screen.getByPlaceholderText('Valor final del plan')).toHaveValue(25000);
    expect(screen.getByLabelText('Plan Activo')).toBeChecked();

    expect(screen.getByDisplayValue('Yoga')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Funcional')).toBeInTheDocument();
  });

  it('Agregar actividad: botón "Agregar Actividad" añade una fila', () => {
    renderForm();

    expect(screen.queryByText('Seleccionar actividad...')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Agregar Actividad'));

    expect(screen.getByText('Seleccionar actividad...')).toBeInTheDocument();
    expect(screen.getByText('clases/sem')).toBeInTheDocument();
    expect(document.querySelectorAll('.activity-row')).toHaveLength(1);
  });

  it('Eliminar actividad: botón Trash2 elimina la fila', () => {
    renderForm();

    fireEvent.click(screen.getByText('Agregar Actividad'));
    expect(screen.getByText('Seleccionar actividad...')).toBeInTheDocument();

    const trashBtn = document.querySelector('.icon-btn.text-danger') as HTMLElement;
    expect(trashBtn).toBeInTheDocument();
    fireEvent.click(trashBtn);

    expect(
      screen.queryByText('Seleccionar actividad...')
    ).not.toBeInTheDocument();
  });

  it('Calcular precio sugerido: sumatoria de basePrice * classes_per_week * 4', () => {
    renderForm();

    fireEvent.click(screen.getByText('Agregar Actividad'));
    const activitySelect = document.querySelector(
      '.activity-row select'
    ) as HTMLSelectElement;
    fireEvent.change(activitySelect, { target: { value: 'Yoga' } });

    const cpwInput = document.querySelector(
      '.activity-row input[type="number"]'
    ) as HTMLInputElement;
    fireEvent.change(cpwInput, { target: { value: 2 } });

    fireEvent.click(screen.getByText('Agregar Actividad'));

    const selects = document.querySelectorAll('.activity-row select');
    fireEvent.change(selects[1], { target: { value: 'Funcional' } });

    const cpwInputs = document.querySelectorAll('.activity-row input[type="number"]');
    fireEvent.change(cpwInputs[1], { target: { value: 1 } });

    const calcBtn = screen.getByTitle('Calcular Sugerido');
    fireEvent.click(calcBtn);

    const expectedPrice = 5000 * 2 * 4 + 4000 * 1 * 4; // 40000 + 16000 = 56000
    expect(
      screen.getByPlaceholderText('Valor final del plan')
    ).toHaveValue(expectedPrice);
  });

  it('Submit con datos válidos: llama a onSubmit con plan + activities filtradas', async () => {
    renderForm();

    fireEvent.change(screen.getByPlaceholderText('Ej: Intermedio A'), {
      target: { value: 'Plan Avanzado' },
    });

    fireEvent.click(screen.getByText('Agregar Actividad'));

    const activitySelect = document.querySelector(
      '.activity-row select'
    ) as HTMLSelectElement;
    fireEvent.change(activitySelect, { target: { value: 'Yoga' } });

    fireEvent.change(screen.getByPlaceholderText('Valor final del plan'), {
      target: { value: '15000' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Plan' }));

    await vi.waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        {
          name: 'Plan Avanzado',
          price: 15000,
          classes_per_week: 1,
          is_active: true,
        },
        [{ activity_name: 'Yoga', classes_per_week: 1 }]
      );
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

    await vi.waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it('Submit con actividad inválida: muestra error', async () => {
    const { rerender } = render(
      <PlanForm
        availableClasses={mockClasses}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Ej: Intermedio A'), {
      target: { value: 'Plan Raro' },
    });

    fireEvent.click(screen.getByText('Agregar Actividad'));

    const activitySelect = document.querySelector(
      '.activity-row select'
    ) as HTMLSelectElement;
    fireEvent.change(activitySelect, { target: { value: 'Yoga' } });

    fireEvent.change(screen.getByPlaceholderText('Valor final del plan'), {
      target: { value: '9999' },
    });

    // Re-render with empty availableClasses so Yoga becomes invalid
    rerender(
      <PlanForm
        availableClasses={[]}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.submit(getForm());

    await vi.waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('Yoga')
      );
    });
  });

  it('Submit sin nombre: muestra error', async () => {
    renderForm();

    fireEvent.click(screen.getByText('Agregar Actividad'));

    const activitySelect = document.querySelector(
      '.activity-row select'
    ) as HTMLSelectElement;
    fireEvent.change(activitySelect, { target: { value: 'Yoga' } });

    fireEvent.change(screen.getByPlaceholderText('Valor final del plan'), {
      target: { value: '15000' },
    });

    fireEvent.submit(getForm());

    await vi.waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
  });

  it('onCancel llama a la prop onCancel', () => {
    renderForm();

    fireEvent.click(screen.getByText('Cancelar'));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
