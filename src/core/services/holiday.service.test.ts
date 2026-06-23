import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HolidayService, type Holiday } from './holiday.service';

// ──────────────────────────────────────────────
// 1. Datos de prueba
// ──────────────────────────────────────────────

const mockApiResponse = [
  { fecha: '2024-01-01', nombre: 'Año Nuevo', tipo: 'inamovible' },
  { fecha: '2024-02-12', nombre: 'Carnaval', tipo: 'inamovible' },
  { fecha: '2024-02-13', nombre: 'Carnaval', tipo: 'inamovible' },
  { fecha: '2024-03-24', nombre: 'Día Nacional de la Memoria', tipo: 'inamovible' },
];

const mockHolidays: Holiday[] = [
  { id: '2024-1-1-0', motivo: 'Año Nuevo', tipo: 'inamovible', dia: 1, mes: 1, id_info: 'Año Nuevo' },
  { id: '2024-2-12-1', motivo: 'Carnaval', tipo: 'inamovible', dia: 12, mes: 2, id_info: 'Carnaval' },
  { id: '2024-2-13-2', motivo: 'Carnaval', tipo: 'inamovible', dia: 13, mes: 2, id_info: 'Carnaval' },
  { id: '2024-3-24-3', motivo: 'Día Nacional de la Memoria', tipo: 'inamovible', dia: 24, mes: 3, id_info: 'Día Nacional de la Memoria' },
];

// ──────────────────────────────────────────────
// 2. Mock de fetch global
// ──────────────────────────────────────────────

const mockFetch = vi.fn();

describe('HolidayService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────
  // getHolidays
  // ────────────────────────────────────────────
  describe('getHolidays', () => {
    it('debería obtener y mapear feriados correctamente', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      const result = await HolidayService.getHolidays(2024);

      expect(result).toEqual(mockHolidays);
      expect(result).toHaveLength(4);
      expect(mockFetch).toHaveBeenCalledWith('https://api.argentinadatos.com/v1/feriados/2024', {
        headers: { Accept: 'application/json' },
      });
    });

    it('debería devolver array vacío si la respuesta no es ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await HolidayService.getHolidays(2024);

      expect(result).toEqual([]);
    });

    it('debería devolver array vacío si hay error de red', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await HolidayService.getHolidays(2024);

      expect(result).toEqual([]);
    });

    it('debería devolver array vacío si el JSON es inválido', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const result = await HolidayService.getHolidays(2024);

      expect(result).toEqual([]);
    });

    it('debería devolver array vacío si la API devuelve data vacía', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await HolidayService.getHolidays(2024);

      expect(result).toEqual([]);
    });
  });

  // ────────────────────────────────────────────
  // isHoliday (pure function)
  // ────────────────────────────────────────────
  describe('isHoliday', () => {
    it('debería encontrar un feriado por fecha', () => {
      const date = new Date(2024, 0, 1); // 1 de enero

      const result = HolidayService.isHoliday(date, mockHolidays);

      expect(result).toBeDefined();
      expect(result!.motivo).toBe('Año Nuevo');
    });

    it('debería devolver undefined si no hay feriado en esa fecha', () => {
      const date = new Date(2024, 5, 15); // 15 de junio

      const result = HolidayService.isHoliday(date, mockHolidays);

      expect(result).toBeUndefined();
    });

    it('debería devolver undefined si el array de feriados está vacío', () => {
      const date = new Date(2024, 0, 1);

      const result = HolidayService.isHoliday(date, []);

      expect(result).toBeUndefined();
    });

    it('debería encontrar el feriado correcto entre varios', () => {
      const date = new Date(2024, 2, 24); // 24 de marzo

      const result = HolidayService.isHoliday(date, mockHolidays);

      expect(result).toBeDefined();
      expect(result!.motivo).toBe('Día Nacional de la Memoria');
      expect(result!.dia).toBe(24);
      expect(result!.mes).toBe(3);
    });
  });
});
