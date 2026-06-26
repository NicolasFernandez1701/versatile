import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClassForm } from './ClassForm';
import type { Profile, ClassEntity } from '@/core/types/classes.types';

const mockGetSpecialties = vi.hoisted(() => vi.fn());
const mockIsTimeRangeValid = vi.hoisted(() => vi.fn((start: string, end: string) => end > start));

vi.mock('@/core/services', () => ({
  usersService: { getSpecialties: mockGetSpecialties },
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
  const defaultOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = (overrides: Partial<{
    teachers: Profile[];
    onSubmit: (payload: Partial<ClassEntity>) => Promise<void>;
    loading: boolean;
    initialData?: Partial<ClassEntity>;
  }> = {}) => {
    const props = {
      teachers: mockTeachers,
      onSubmit: defaultOnSubmit,
      loading: false,
      ...overrides,
    };
    return render(<ClassForm {...props} />);
  };

  it('Renderiza todos los campos del form', () => {
    mockGetSpecialties.mockResolvedValueOnce([]);
    renderForm();

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

    await vi.waitFor(() => {
      expect(mockGetSpecialties).toHaveBeenCalledTimes(1);
    });
  });

  it('Autocomplete dropdown: escribe en actividad, muestra opciones filtradas', async () => {
    mockGetSpecialties.mockResolvedValueOnce(mockSpecialties);
    renderForm();

    const activityInput = screen.getByPlaceholderText('Ej: Funcional, Yoga');
    fireEvent.focus(activityInput);

    await vi.waitFor(() => {
      expect(screen.getByText('Yoga')).toBeInTheDocument();
    });
    expect(screen.getByText('Funcional')).toBeInTheDocument();
    expect(screen.getByText('Pilates')).toBeInTheDocument();

    fireEvent.change(activityInput, { target: { value: 'Yo' } });

    await vi.waitFor(() => {
      expect(screen.getByText('Yoga')).toBeInTheDocument();
    });
    expect(screen.queryByText('Funcional')).not.toBeInTheDocument();
    expect(screen.queryByText('Pilates')).not.toBeInTheDocument();
  });

  it('Seleccionar opción del autocomplete: se llena el campo y se cierra dropdown', async () => {
    mockGetSpecialties.mockResolvedValueOnce(mockSpecialties);
    renderForm();

    const activityInput = screen.getByPlaceholderText('Ej: Funcional, Yoga');
    fireEvent.focus(activityInput);

    await vi.waitFor(() => {
      expect(screen.getByText('Yoga')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Yoga'));

    expect(activityInput).toHaveValue('Yoga');
    expect(screen.queryByText('Funcional')).not.toBeInTheDocument();
  });

  it('Submit llama a onSubmit con los datos del form', async () => {
    const onSubmit = vi.fn();
    mockGetSpecialties.mockResolvedValueOnce(mockSpecialties);
    renderForm({ onSubmit: onSubmit as (payload: Partial<ClassEntity>) => Promise<void> });

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

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_name: 'Yoga',
          teacher_id: 't1',
          day_of_week: 3,
          start_time: '09:00',
          end_time: '10:00',
        })
      );
    });
  });

  it('Loading deshabilita botón', () => {
    mockGetSpecialties.mockResolvedValueOnce([]);
    renderForm({ loading: true });

    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
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
    await vi.waitFor(() => {
      expect(activityInput).toHaveValue('Pilates');
    });

    expect(screen.getByDisplayValue('Viernes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('11:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    expect(screen.getByDisplayValue('6000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('40')).toBeInTheDocument();
  });

  it('Teachers se renderizan en el select', () => {
    mockGetSpecialties.mockResolvedValueOnce([]);
    renderForm();

    expect(screen.getByText('María Gómez')).toBeInTheDocument();
    expect(screen.getByText('Ana López')).toBeInTheDocument();
  });

  it('onChange de cada campo actualiza el formData', () => {
    mockGetSpecialties.mockResolvedValueOnce([]);
    renderForm();

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
    const onSubmit = vi.fn();
    mockGetSpecialties.mockResolvedValueOnce([]);
    const { container } = renderForm({ onSubmit: onSubmit as (payload: Partial<ClassEntity>) => Promise<void> });

    fireEvent.change(screen.getByDisplayValue('18:00'), {
      target: { value: '14:00' },
    });
    fireEvent.change(screen.getByDisplayValue('19:00'), {
      target: { value: '10:00' },
    });

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(
        screen.getByText('La hora de fin debe ser posterior a la de inicio.')
      ).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('end_time igual a start_time: rechaza submit y muestra error', async () => {
    const onSubmit = vi.fn();
    mockGetSpecialties.mockResolvedValueOnce([]);
    const { container } = renderForm({ onSubmit: onSubmit as (payload: Partial<ClassEntity>) => Promise<void> });

    fireEvent.change(screen.getByDisplayValue('18:00'), {
      target: { value: '10:00' },
    });
    fireEvent.change(screen.getByDisplayValue('19:00'), {
      target: { value: '10:00' },
    });

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(
        screen.getByText('La hora de fin debe ser posterior a la de inicio.')
      ).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('midnight boundary (23:00 → 00:30): rechaza submit', async () => {
    const onSubmit = vi.fn();
    mockGetSpecialties.mockResolvedValueOnce([]);
    const { container } = renderForm({ onSubmit: onSubmit as (payload: Partial<ClassEntity>) => Promise<void> });

    fireEvent.change(screen.getByDisplayValue('18:00'), {
      target: { value: '23:00' },
    });
    fireEvent.change(screen.getByDisplayValue('19:00'), {
      target: { value: '00:30' },
    });

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(
        screen.getByText('La hora de fin debe ser posterior a la de inicio.')
      ).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
