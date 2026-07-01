import type { Holiday } from '../types/holiday.types';

export type { Holiday } from '../types/holiday.types';

const API_BASE = 'https://api.argentinadatos.com/v1/feriados';

interface ArgentinaDatosHoliday {
  fecha: string;
  nombre: string;
  tipo: string;
}

export const HolidayService = {
  getHolidays: async (year: number): Promise<Holiday[]> => {
    try {
      const response = await fetch(`${API_BASE}/${year}`, {
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();

      // Mapeamos el formato de ArgentinaDatos a la interfaz local Holiday
      return data.map((item: ArgentinaDatosHoliday, index: number) => {
        // item.fecha viene como "YYYY-MM-DD"
        const parts = item.fecha.split('-');
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);

        return {
          id: `${year}-${month}-${day}-${index}`,
          motivo: item.nombre,
          tipo: item.tipo,
          dia: day,
          mes: month,
          id_info: item.nombre
        };
      });
    } catch (error) {
      console.warn('Error fetching holidays (Network):', error);
      return [];
    }
  },

  isHoliday: (date: Date, holidays: Holiday[]): Holiday | undefined => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return holidays.find((h) => h.dia === day && h.mes === month);
  }
};
