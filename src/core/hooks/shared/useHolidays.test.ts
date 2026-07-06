import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHolidays, getHolidayForDate } from './useHolidays';
import type { Holiday } from '@/core/services/holiday.service';

const { mockGetHolidays } = vi.hoisted(() => ({
  mockGetHolidays: vi.fn(),
}));

vi.mock('@/core/services/holiday.service', () => ({
  HolidayService: {
    getHolidays: mockGetHolidays,
  },
}));

describe('useHolidays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería cargar feriados y exponer markedDates', async () => {
    const mockHolidays = [
      { id: '1', motivo: 'Año Nuevo', tipo: 'inamovible', dia: 1, mes: 1 },
      { id: '2', motivo: 'Navidad', tipo: 'inamovible', dia: 25, mes: 12 },
    ];

    mockGetHolidays.mockResolvedValue(mockHolidays);

    const { result } = renderHook(() => useHolidays(2025));

    await waitFor(() => {
      expect(result.current.holidays).toEqual(mockHolidays);
    });

    const { markedDates } = result.current;
    expect(getHolidayForDate(new Date(2025, 0, 1), markedDates)?.motivo).toBe('Año Nuevo');
    expect(getHolidayForDate(new Date(2025, 11, 25), markedDates)?.motivo).toBe('Navidad');
  });

  it('debería devolver lista vacía si no hay feriados', async () => {
    mockGetHolidays.mockResolvedValue([]);

    const { result } = renderHook(() => useHolidays(2025));

    await waitFor(() => {
      expect(result.current.holidays).toEqual([]);
    });

    expect(getHolidayForDate(new Date(2025, 0, 1), result.current.markedDates)).toBeUndefined();
  });

  it('getHolidayForDate debería devolver el feriado si existe', async () => {
    const mockHolidays = [
      { id: '1', motivo: 'Año Nuevo', tipo: 'inamovible', dia: 1, mes: 1 },
    ];

    mockGetHolidays.mockResolvedValue(mockHolidays);

    const { result } = renderHook(() => useHolidays(2025));

    await waitFor(() => {
      expect(result.current.holidays).toHaveLength(1);
    });

    const { markedDates } = result.current;
    const holiday = getHolidayForDate(new Date(2025, 0, 1), markedDates);
    expect(holiday).toBeDefined();
    expect(holiday!.motivo).toBe('Año Nuevo');

    const noHoliday = getHolidayForDate(new Date(2025, 5, 15), markedDates);
    expect(noHoliday).toBeUndefined();
  });

  it('debería re-fetch si cambia el año', async () => {
    mockGetHolidays.mockResolvedValue([]);

    const { rerender } = renderHook(({ year }: { year: number }) => useHolidays(year), {
      initialProps: { year: 2025 },
    });

    await waitFor(() => {
      expect(mockGetHolidays).toHaveBeenCalledTimes(1);
    });

    rerender({ year: 2026 });

    await waitFor(() => {
      expect(mockGetHolidays).toHaveBeenCalledTimes(2);
    });
  });
});

describe('getHolidayForDate', () => {
  const markedDates: Record<string, { id: string; motivo: string; tipo: string; dia: number; mes: number }> = {
    '2025-01-01': { id: '1', motivo: 'Año Nuevo', tipo: 'inamovible', dia: 1, mes: 1 },
    '2025-12-25': { id: '2', motivo: 'Navidad', tipo: 'inamovible', dia: 25, mes: 12 },
  };

  it('devuelve el feriado si la fecha existe en markedDates', () => {
    const result = getHolidayForDate(new Date(2025, 0, 1), markedDates as Record<string, Holiday>);
    expect(result).toBeDefined();
    expect(result?.motivo).toBe('Año Nuevo');
  });

  it('devuelve undefined si la fecha no está en markedDates', () => {
    const result = getHolidayForDate(new Date(2025, 5, 15), markedDates as Record<string, Holiday>);
    expect(result).toBeUndefined();
  });

  it('formatea correctamente fechas con día y mes de un dígito', () => {
    const dates: Record<string, { id: string; motivo: string; tipo: string; dia: number; mes: number }> = {
      '2025-03-05': { id: '3', motivo: 'Día del Trabajador', tipo: 'inamovible', dia: 5, mes: 3 },
    };
    const result = getHolidayForDate(new Date(2025, 2, 5), dates as Record<string, Holiday>);
    expect(result?.motivo).toBe('Día del Trabajador');
  });

  it('devuelve undefined con markedDates vacío', () => {
    const result = getHolidayForDate(new Date(2025, 0, 1), {});
    expect(result).toBeUndefined();
  });
});
