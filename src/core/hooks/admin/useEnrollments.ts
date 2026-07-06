import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useAlert } from '@/ui/GlobalAlertProvider';
import { enrollmentsService, classesService } from '@/core/services';
import type { EnrollmentEntity } from '@/core/types/enrollments.types';
import type { ClassEntity } from '@/core/types/classes.types';

export interface UseEnrollmentsResult {
  enrollments: EnrollmentEntity[];
  classesList: ClassEntity[];
  loading: boolean;
  loadData: () => Promise<void>;
  deleteEnrollment: (id: string) => Promise<void>;
}

export function useEnrollments(): UseEnrollmentsResult {
  const { current_studio_id } = useAuthStore();
  const { showError, showSuccess } = useAlert();

  const [enrollments, setEnrollments] = useState<EnrollmentEntity[]>([]);
  const [classesList, setClassesList] = useState<ClassEntity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!current_studio_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [enrollmentsData, classesData] = await Promise.all([
        enrollmentsService.getEnrollments(),
        classesService.getClasses(current_studio_id),
      ]);
      setEnrollments(enrollmentsData);
      setClassesList(classesData);
    } catch (error: unknown) {
      showError('Error cargando las reservas.');
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  }, [current_studio_id, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const deleteEnrollment = useCallback(
    async (id: string) => {
      try {
        await enrollmentsService.unenrollStudent(id);
        await loadData();
        showSuccess('Alumno desinscripto.');
      } catch (error: unknown) {
        showError('Error al desinscribir.');
      }
    },
    [loadData, showError, showSuccess],
  );

  return {
    enrollments,
    classesList,
    loading,
    loadData,
    deleteEnrollment,
  };
}
