import { useCallback } from 'react';

export type StudentStatus = 'Al Día' | 'Pendiente' | 'Vencido' | 'Sin Plan';

export interface UseStudentStatusResult {
  getStatus: (endDate?: string | null, hasPlan?: boolean) => StudentStatus;
}

export function useStudentStatus(): UseStudentStatusResult {
  const getStatus = useCallback((endDate?: string | null, hasPlan = true): StudentStatus => {
    if (!hasPlan) return 'Sin Plan';
    if (!endDate) return 'Pendiente';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exp = new Date(endDate);
    exp.setHours(0, 0, 0, 0);

    if (exp < today) return 'Vencido';
    return 'Al Día';
  }, []);

  return { getStatus };
}
