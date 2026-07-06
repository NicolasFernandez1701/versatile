import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClassForm } from './ClassForm';
import type { Profile, ClassEntity } from '@/core/types/classes.types';

const mockGetSpecialties = vi.hoisted(() => vi.fn());
const mockCreateClass = vi.hoisted(() => vi.fn());
const mockUpdateClass = vi.hoisted(() => vi.fn());
const mockIsTimeRangeValid = vi.hoisted(() => vi.fn((start: string, end: string) => end > start));
const mockOnSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  usersService: { getSpecialties: mockGetSpecialties },
  classesService: {
    createClass: mockCreateClass,
    updateClass: mockUpdateClass,
  },
}));

vi.mock('@/core/components/GlobalAlertProvider', () => ({
  useAlert: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock('@/core/utils/validation', () => ({
  isTimeRangeValid: mockIsTimeRangeValid,
}));

const mockTeachers: Profile[] = [
  { id: 't1', full_name: 'María Gómez' },
  { id: 't2', full_name: 'Ana López' },
];

const mockSpecialties = [
  { id: 's1', name: 'Yoga' },
  { id: 's2', name: 'Funcional' },
  { id: 's3', name: 'Pilates' },
];

describe('ClassForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSpecialties.mockResolvedValue([]);
  });

  const renderForm = (overrides: Partial<{
    teachers: Profile[];
    onSuccess: () => void;
    initialData?: Partial<ClassEntity>;
  }> = {}) => {
    const props = {
      teachers: mockTeachers,
      onSuccess: mockOnSuccess,
      ...overrides,
    };
    return render(<ClassForm {...props} />);
  };

  it('Renderiza todos los campos del form', async () => {
    mockGetSpecialties.mockResolvedValueOnce([]);
    renderForm();

    await waitFor(() => {
      expect(mockGetSpecialties).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByPlaceholderText('Ej: Funcional, Yoga')
    ).toBeInTheDocument();
    expect(screen.getByText('Profesora')).toBeInTheDocument();
    expect(screen.getByText('Día')).toBeInTheDocument();
    expect(screen.getByText('Inicio (HH:MM)')).toBeInTheDocument();
    expect(screen.getByText('Fin (HH:MM)')).toBeInTheDocument();
    expect(screen.getByText('Capacidad')).toBeInTheDocument();
    expect(screen.getByText('Precio Base ($)')).toBeInTheDocument();
    expect(screen.getByText('Comisión Profesora (%)')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar Clase' })
    ).toBeInTheDocument();
  });

  it('Carga specialties al montar (verificar que se llamó getSpecialties)', async () => {
    mockGetSpecialties.mockResolvedValueOnce(mockSpecialties);
    renderForm();

    await waitFor(() => {
      expect(mockGetSpecialties).toHaveBeenCalledTimes(1);
    });
  });

  it('Autocomplete dropdown: escribe en actividad, muestra opciones filtradas', async () => {
    mockGetSpecialties.mockResolvedValue(mockSpecialties);
    renderForm();

    await waitFor(() => {
      expect(mockGetSpecialties).toHaveBeenCalledTimes(1);
    });

    const activityInput = screen.getByPlaceholderText('Ej: Funcional, Yoga');
    fireEvent.focus(activityInput);

    await waitFor(() => {
      expect(screen.getByText('Yoga')).toBeInTheDocument();
    });
    expect(screen.getByText('Funcional')).toBeInTheDocument();
    expect(screen.getByText('Pilates')).toBeInTheDocument();

    fireEvent.change(activityInput, { target: { value: 'Yo' } });

    await waitFor(() => {
      expect(screen.getByText('Yoga')).toBeInTheDocument();
    });
    expect(screen.queryByText('Funcional')).not.toBeInTheDocument();
    expect(screen.queryByText('Pilates')).not.toBeInTheDocument();
  });

  it('Seleccionar opción del autocomplete: se llena el campo y se cierra dropdown', async () => {
    mockGetSpecialties.mockResolvedValue(mockSpecialties);
    renderForm();

    await waitFor(() => {
      expect(mockGetSpecialties).toHaveBeenCalledTimes(1);
    });

    const activityInput = screen.getByPlaceholderText('Ej: Funcional, Yoga');
    fireEvent.focus(activityInput);

    await waitFor(() => {
      expect(screen.getByText('Yoga')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Yoga'));

    expect(activityInput).toHaveValue('Yoga');
    expect(screen.queryByText('Funcional')).not.toBeInTheDocument();
  });

  it('Submit crea una clase con los datos del form', async () => {
    mockGetSpecialties.mockResolvedValueOnce(mockSpecialties);
    mockCreateClass.mockResolvedValueOnce(undefined);
    renderForm();

    const activityInput = screen.getByPlaceholderText('Ej: Funcional, Yoga');
    fireEvent.change(activityInput, { target: { value: 'Yoga' } });

    const teacherSelect = screen.getByDisplayValue('Seleccionar Profesora');
    fireEvent.change(teacherSelect, { target: { value: 't1' } });

    const daySelect = screen.getByDisplayValue('Lunes');
    fireEvent.change(daySelect, { target: { value: 3 } });

    fireEvent.change(screen.getByDisplayValue('18:00'), {
      target: { value: '09:00' },
    });
    fireEvent.change(screen.getByDisplayValue('19:00'), {
      target: { value: '10:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Clase' }));

    await waitFor(() => {
      expect(mockCreateClass).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_name: 'Yoga',
          teacher_id: 't1',
          day_of_week: 3,
          start_time: '09:00',
          end_time: '10:00',
        })
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('Submit actualiza una clase cuando hay initialData', async () => {
    mockGetSpecialties.mockResolvedValueOnce(mockSpecialties);
    mockUpdateClass.mockResolvedValueOnce(undefined);
    const initialData: Partial<ClassEntity> = {
      id: 'cls-001',
      activity_name: 'Pilates',
      teacher_id: 't2',
      day_of_week: 5,
      start_time: '10:00',
      end_time: '11:00',
      capacity: 20,
      base_price: 6000,
      teacher_commission_pct: 40,
    };

    renderForm({ initialData });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ej: Funcional, Yoga')).toHaveValue('Pilates');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Clase' }));

    await waitFor(() => {
      expect(mockUpdateClass).toHaveBeenCalledWith(
        'cls-001',
        expect.objectContaining({
          activity_name: 'Pilates',
          teacher_id: 't2',
        })
      );
      expect(mockCreateClass).not.toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('Loading deshabilita botón durante el submit', async () => {
    mockGetSpecialties.mockResolvedValueOnce([]);
    let resolveCreate: (value: unknown) => void = () => {};
    mockCreateClass.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );

    renderForm();

    const activityInput = screen.getByPlaceholderText('Ej: Funcional, Yoga');
    fireEvent.change(activityInput, { target: { value: 'Yoga' } });
    const teacherSelect = screen.getByDisplayValue('Seleccionar Profesora');
    fireEvent.change(teacherSelect, { target: { value: 't1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Clase' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
    });

    resolveCreate(undefined);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Guardar Clase' })).toBeEnabled();
    });
  });

  it('initialData precarga los valores', async () => {
    mockGetSpecialties.mockResolvedValueOnce(mockSpecialties);
    const initialData: Partial<ClassEntity> = {
      activity_name: 'Pilates',
      teacher_id: 't2',
      day_of_week: 5,
      start_time: '10:00',
      end_time: '11:00',
      capacity: 20,
      base_price: 6000,
      teacher_commission_pct: 40,
    };

    renderForm({ initialData });

    const activityInput = screen.getByPlaceholderText('Ej: Funcional, Yoga');
    await waitFor(() => {
      expect(activityInput).toHaveValue('Pilates');
    });

    expect(screen.getByDisplayValue('Viernes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('11:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    expect(screen.getByDisplayValue('6000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('40')).toBeInTheDocument();
  });

  it('Teachers se renderizan en el select', async () => {
    mockGetSpecialties.mockResolvedValueOnce([]);
    renderForm();

    await waitFor(() => {
      expect(mockGetSpecialties).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('María Gómez')).toBeInTheDocument();
    expect(screen.getByText('Ana López')).toBeInTheDocument();
  });

  it('onChange de cada campo actualiza los valores del hook', async () => {
    mockGetSpecialties.mockResolvedValueOnce([]);
    renderForm();

    await waitFor(() => {
      expect(mockGetSpecialties).toHaveBeenCalledTimes(1);
    });

    const activityInput = screen.getByPlaceholderText('Ej: Funcional, Yoga');
    fireEvent.change(activityInput, { target: { value: 'Spinning' } });
    expect(activityInput).toHaveValue('Spinning');

    const teacherSelect = screen.getByDisplayValue('Seleccionar Profesora');
    fireEvent.change(teacherSelect, { target: { value: 't2' } });
    expect(teacherSelect).toHaveValue('t2');

    const daySelect = screen.getByDisplayValue('Lunes');
    fireEvent.change(daySelect, { target: { value: 4 } });
    expect(daySelect).toHaveValue('4');

    const startTime = screen.getByDisplayValue('18:00');
    fireEvent.change(startTime, { target: { value: '07:00' } });
    expect(startTime).toHaveValue('07:00');

    const endTime = screen.getByDisplayValue('19:00');
    fireEvent.change(endTime, { target: { value: '08:00' } });
    expect(endTime).toHaveValue('08:00');

    const capacity = screen.getByDisplayValue('15');
    fireEvent.change(capacity, { target: { value: 25 } });
    expect(capacity).toHaveValue(25);

    const basePrice = screen.getByDisplayValue('5000');
    fireEvent.change(basePrice, { target: { value: 7000 } });
    expect(basePrice).toHaveValue(7000);

    const commission = screen.getByDisplayValue('50');
    fireEvent.change(commission, { target: { value: 30 } });
    expect(commission).toHaveValue(30);
  });

  it('end_time antes que start_time: rechaza submit y muestra error', async () => {
    mockGetSpecialties.mockResolvedValueOnce([]);
    mockIsTimeRangeValid.mockReturnValueOnce(false);
    const { container } = renderForm();

    await waitFor(() => {
      expect(mockGetSpecialties).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByPlaceholderText('Ej: Funcional, Yoga'), {
      target: { value: 'Yoga' },
    });
    const teacherSelect = screen.getByDisplayValue('Seleccionar Profesora');
    fireEvent.change(teacherSelect, { target: { value: 't1' } });

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(
        screen.getByText('La hora de fin debe ser posterior a la de inicio.')
      ).toBeInTheDocument();
    });
    expect(mockCreateClass).not.toHaveBeenCalled();
  });
});
