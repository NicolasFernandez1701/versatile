import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHolidays } from './useHolidays';

const { mockGetHolidays } = vi.hoisted(() => ({
  mockGetHolidays: vi.fn(),
}));

vi.mock('../services/holiday.service', () => ({
  HolidayService: {
    getHolidays: mockGetHolidays,
  },
}));

describe('useHolidays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería cargar feriados y exponer getHolidayForDate', async () => {
    const mockHolidays = [
      { id: '1', motivo: 'Año Nuevo', tipo: 'inamovible', dia: 1, mes: 1 },
      { id: '2', motivo: 'Navidad', tipo: 'inamovible', dia: 25, mes: 12 },
    ];

    mockGetHolidays.mockResolvedValue(mockHolidays);

    const { result } = renderHook(() => useHolidays(2025));

    await waitFor(() => {
      expect(result.current.holidays).toEqual(mockHolidays);
    });

    expect(result.current.getHolidayForDate(new Date(2025, 0, 1))?.motivo).toBe('Año Nuevo');
    expect(result.current.getHolidayForDate(new Date(2025, 11, 25))?.motivo).toBe('Navidad');
  });

  it('debería devolver lista vacía si no hay feriados', async () => {
    mockGetHolidays.mockResolvedValue([]);

    const { result } = renderHook(() => useHolidays(2025));

    await waitFor(() => {
      expect(result.current.holidays).toEqual([]);
    });

    expect(result.current.getHolidayForDate(new Date(2025, 0, 1))).toBeUndefined();
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

    const holiday = result.current.getHolidayForDate(new Date(2025, 0, 1));
    expect(holiday).toBeDefined();
    expect(holiday!.motivo).toBe('Año Nuevo');

    const noHoliday = result.current.getHolidayForDate(new Date(2025, 5, 15));
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
