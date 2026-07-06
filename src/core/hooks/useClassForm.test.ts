import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useClassForm } from './useClassForm';
import type { ClassEntity } from '@/core/types/classes.types';
import type { Specialty } from '@/core/types/users.types';

const mockGetSpecialties = vi.hoisted(() => vi.fn());
const mockCreateClass = vi.hoisted(() => vi.fn());
const mockUpdateClass = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockOnSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  usersService: {
    getSpecialties: mockGetSpecialties,
  },
  classesService: {
    createClass: mockCreateClass,
    updateClass: mockUpdateClass,
  },
}));

vi.mock('@/core/components/GlobalAlertProvider', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

const mockSpecialties: Specialty[] = [
  { id: 'sp-001', name: 'Yoga' },
  { id: 'sp-002', name: 'Funcional' },
];

const baseClass: Partial<ClassEntity> = {
  id: 'cls-001',
  activity_name: 'Yoga',
  teacher_id: 'tea-001',
  day_of_week: 2,
  start_time: '09:00',
  end_time: '10:00',
  capacity: 20,
  base_price: 6000,
  teacher_commission_pct: 40,
};

describe('useClassForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSpecialties.mockResolvedValue(mockSpecialties);
    mockCreateClass.mockResolvedValue(undefined);
    mockUpdateClass.mockResolvedValue(undefined);
  });

  it('initializes with default values', async () => {
    const { result } = renderHook(() => useClassForm());

    expect(result.current.activityName).toBe('');
    expect(result.current.dayOfWeek).toBe(1);
    expect(result.current.startTime).toBe('18:00');
    expect(result.current.endTime).toBe('19:00');
    expect(result.current.teacher).toBe('');
    expect(result.current.maxCapacity).toBe(15);
    expect(result.current.basePrice).toBe(5000);
    expect(result.current.teacherCommission).toBe(50);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.specialties).toEqual([]);

    await waitFor(() => expect(result.current.specialties).toEqual(mockSpecialties));
  });

  it('initializes from initialData', async () => {
    const { result } = renderHook(() => useClassForm({ initialData: baseClass }));

    expect(result.current.activityName).toBe('Yoga');
    expect(result.current.dayOfWeek).toBe(2);
    expect(result.current.startTime).toBe('09:00');
    expect(result.current.endTime).toBe('10:00');
    expect(result.current.teacher).toBe('tea-001');
    expect(result.current.maxCapacity).toBe(20);
    expect(result.current.basePrice).toBe(6000);
    expect(result.current.teacherCommission).toBe(40);

    await waitFor(() => expect(result.current.specialties).toEqual(mockSpecialties));
  });

  it('updates fields via setField', async () => {
    const { result } = renderHook(() => useClassForm());

    act(() => {
      result.current.setField('activityName', 'Funcional');
      result.current.setField('dayOfWeek', 3);
      result.current.setField('startTime', '08:00');
      result.current.setField('endTime', '09:00');
      result.current.setField('teacher', 'tea-002');
      result.current.setField('maxCapacity', 25);
      result.current.setField('basePrice', 7000);
      result.current.setField('teacherCommission', 45);
    });

    expect(result.current.activityName).toBe('Funcional');
    expect(result.current.dayOfWeek).toBe(3);
    expect(result.current.startTime).toBe('08:00');
    expect(result.current.endTime).toBe('09:00');
    expect(result.current.teacher).toBe('tea-002');
    expect(result.current.maxCapacity).toBe(25);
    expect(result.current.basePrice).toBe(7000);
    expect(result.current.teacherCommission).toBe(45);

    await waitFor(() => expect(result.current.specialties).toEqual(mockSpecialties));
  });

  it('resets fields to initialData', async () => {
    const { result } = renderHook(() => useClassForm({ initialData: baseClass }));

    act(() => {
      result.current.setField('activityName', 'Otra');
      result.current.reset();
    });

    expect(result.current.activityName).toBe('Yoga');
    expect(result.current.error).toBe('');

    await waitFor(() => expect(result.current.specialties).toEqual(mockSpecialties));
  });

  it('loads specialties on mount', async () => {
    const { result } = renderHook(() => useClassForm());

    await waitFor(() => expect(result.current.specialties).toEqual(mockSpecialties));

    expect(mockGetSpecialties).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('creates a class on submit', async () => {
    const { result } = renderHook(() => useClassForm({ onSuccess: mockOnSuccess }));

    act(() => {
      result.current.setField('activityName', 'Pilates');
      result.current.setField('teacher', 'tea-001');
      result.current.setField('startTime', '10:00');
      result.current.setField('endTime', '11:00');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateClass).toHaveBeenCalledWith(
      expect.objectContaining({
        activity_name: 'Pilates',
        teacher_id: 'tea-001',
        start_time: '10:00',
        end_time: '11:00',
      }),
    );
    expect(mockShowSuccess).toHaveBeenCalledWith('Clase creada con éxito.');
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('updates a class when initialData has an id', async () => {
    const { result } = renderHook(() => useClassForm({ initialData: baseClass, onSuccess: mockOnSuccess }));

    act(() => {
      result.current.setField('activityName', 'Yoga Avanzado');
      result.current.setField('maxCapacity', 30);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockUpdateClass).toHaveBeenCalledWith(
      'cls-001',
      expect.objectContaining({
        activity_name: 'Yoga Avanzado',
        capacity: 30,
      }),
    );
    expect(mockCreateClass).not.toHaveBeenCalled();
    expect(mockShowSuccess).toHaveBeenCalledWith('Clase actualizada con éxito.');
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('prevents submit when end time is not after start time', async () => {
    const { result } = renderHook(() => useClassForm());

    act(() => {
      result.current.setField('activityName', 'Yoga');
      result.current.setField('teacher', 'tea-001');
      result.current.setField('startTime', '10:00');
      result.current.setField('endTime', '09:00');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateClass).not.toHaveBeenCalled();
    expect(mockUpdateClass).not.toHaveBeenCalled();
    expect(result.current.error).toBe('La hora de fin debe ser posterior a la de inicio.');
    expect(result.current.loading).toBe(false);
  });

  it('surfaces service errors and stops loading', async () => {
    mockCreateClass.mockRejectedValueOnce(new Error('Duplicate activity'));
    const { result } = renderHook(() => useClassForm());

    act(() => {
      result.current.setField('activityName', 'Yoga');
      result.current.setField('teacher', 'tea-001');
      result.current.setField('startTime', '10:00');
      result.current.setField('endTime', '11:00');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('Duplicate activity');
    expect(mockShowError).toHaveBeenCalledWith('Error: Duplicate activity');
    expect(result.current.loading).toBe(false);
  });
});
