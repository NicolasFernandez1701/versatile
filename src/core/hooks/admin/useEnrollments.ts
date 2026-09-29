import { useCallback } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useAlert } from '@/ui/useAlert';
import { enrollmentsService, classesService } from '@/core/services';
import { useAsyncResource } from '@/core/hooks/shared/useAsyncResource';
import type { EnrollmentEntity } from '@/core/types/enrollments.types';
import type { ClassEntity } from '@/core/types/classes.types';

export interface UseEnrollmentsResult {
  enrollments: EnrollmentEntity[];
  classesList: ClassEntity[];
  loading: boolean;
  loadData: () => Promise<void>;
  deleteEnrollment: (id: string) => Promise<void>;
}

interface EnrollmentsResource {
  enrollments: EnrollmentEntity[];
  classesList: ClassEntity[];
}

export function useEnrollments(): UseEnrollmentsResult {
  const { current_studio_id } = useAuthStore();
  const { showError, showSuccess } = useAlert();

  const resource = useAsyncResource<EnrollmentsResource>(
    async () => {
      if (!current_studio_id) {
        throw new Error('useEnrollments requires a studio id');
      }
      const [enrollmentsData, classesData] = await Promise.all([
        enrollmentsService.getEnrollments(),
        classesService.getClasses(current_studio_id),
      ]);
      return { enrollments: enrollmentsData, classesList: classesData };
    },
    [current_studio_id],
    {
      enabled: !!current_studio_id,
      onError: (error) => {
        showError('Error cargando las reservas.');
        console.error('Error fetching enrollments:', error);
      },
    },
  );

  const loadData = resource.refetch;

  const enrollments = resource.data?.enrollments ?? [];
  const classesList = resource.data?.classesList ?? [];
  const loading = resource.loading;

  const deleteEnrollment = useCallback(
    async (id: string) => {
      try {
        await enrollmentsService.unenrollStudent(id);
        await loadData();
        showSuccess('Alumno desinscripto.');
      } catch {
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
