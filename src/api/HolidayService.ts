import axios from 'axios';
import { format } from 'date-fns';

const API_BASE = 'https://nolaborables.com.ar/api/v2/feriados';

export interface Holiday {
  id: string;
  motivo: string;
  tipo: string;
  dia: number;
  mes: number;
  id_info: string;
}

export const HolidayService = {
  getHolidays: async (year: number): Promise<Holiday[]> => {
    try {
      const response = await axios.get(`${API_BASE}/${year}?incluir=opcional`);
      return response.data;
    } catch (error) {
      console.error('Error fetching holidays:', error);
      return [];
    }
  },

  isHoliday: (date: Date, holidays: Holiday[]): Holiday | undefined => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return holidays.find(h => h.dia === day && h.mes === month);
  }
};
