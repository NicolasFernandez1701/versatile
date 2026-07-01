import { useState, useEffect } from 'react';
import { HolidayService } from '../services/holiday.service';
import type { Holiday } from '../types/holiday.types';

export function getHolidayForDate(date: Date, markedDates: Record<string, Holiday>): Holiday | undefined {
  const dayStr = date.getDate() < 10 ? `0${date.getDate()}` : `${date.getDate()}`;
  const monthStr = date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : `${date.getMonth() + 1}`;
  const dateKey = `${date.getFullYear()}-${monthStr}-${dayStr}`;
  return markedDates[dateKey];
}

export const useHolidays = (year: number) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [markedDates, setMarkedDates] = useState<Record<string, Holiday>>({});
  const [loadingHolidays, setLoadingHolidays] = useState(true);

  useEffect(() => {
    const fetchHolidays = async () => {
      setLoadingHolidays(true);
      const data = await HolidayService.getHolidays(year);

      const marked: Record<string, Holiday> = {};
      data.forEach((h: Holiday) => {
        const dayStr = h.dia < 10 ? `0${h.dia}` : `${h.dia}`;
        const monthStr = h.mes < 10 ? `0${h.mes}` : `${h.mes}`;
        const dateKey = `${year}-${monthStr}-${dayStr}`;
        marked[dateKey] = h;
      });

      setMarkedDates(marked);
      setHolidays(data);
      setLoadingHolidays(false);
    };

    fetchHolidays();
  }, [year]);

  return { holidays, markedDates, loadingHolidays };
};
