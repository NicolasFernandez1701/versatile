import { useState, useEffect } from 'react';
import { dashboardService } from '@/core/services';
import type { StudentDashboardData, StudentClassLimit } from '@/core/types/dashboard.types';

export interface UseStudentDashboardResult {
  data: StudentDashboardData | null;
  classLimit: StudentClassLimit | null;
  loading: boolean;
}

export function useStudentDashboard(userId: string | undefined): UseStudentDashboardResult {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [classLimit, setClassLimit] = useState<StudentClassLimit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    Promise.all([
      dashboardService.getStudentDashboardData(userId),
      dashboardService.getStudentClassLimit(userId),
    ])
      .then(([dashboardData, limitData]) => {
        if (!mounted) return;
        setData(dashboardData);
        setClassLimit(limitData);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        console.error('Error fetching student dashboard:', error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [userId]);

  return {
    data,
    classLimit,
    loading,
  };
}
