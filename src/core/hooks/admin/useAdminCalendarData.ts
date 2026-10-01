import { useCallback, useState } from 'react';
import { classesService } from '@/core/services';
import { useAsyncResource, type RefetchOptions } from '@/core/hooks/shared/useAsyncResource';
import type { ClassEntity, EnrollmentEntity } from '@/core/types/classes.types';

export interface UseAdminCalendarDataResult {
  classes: ClassEntity[];
  loading: boolean;
  refetch: (options?: RefetchOptions) => Promise<void>;
  viewingStudentsClass: ClassEntity | null;
  students: EnrollmentEntity[];
  loadingStudents: boolean;
  openStudentsModal: (cls: ClassEntity, reservationDate: string) => Promise<void>;
  closeStudentsModal: () => void;
}

/**
 * Calendar-page data access: the classes list and the enrolled-students modal.
 * Extracted from AdminCalendarPage so the page stops importing the services
 * layer. Runtime contract mirrors the previous page behavior, with one
 * accepted delta (AD-2): a missing studio id reports `loading: false` instead
 * of the previous permanently-stuck loader, and never calls the service.
 */
export function useAdminCalendarData(studioId: string | undefined): UseAdminCalendarDataResult {
  const resource = useAsyncResource<ClassEntity[]>(
    async () => {
      if (!studioId) {
        throw new Error('useAdminCalendarData requires a studio id');
      }
      return classesService.getClasses(studioId);
    },
    [studioId],
    {
      enabled: !!studioId,
      // The page had no toast here: it logged the raw error and nothing else.
      onError: (error) => {
        console.error(error);
      },
    },
  );

  const [viewingStudentsClass, setViewingStudentsClass] = useState<ClassEntity | null>(null);
  const [students, setStudents] = useState<EnrollmentEntity[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // The caller computes the YYYY-MM-DD reservation date (it owns the selected
  // calendar day) and passes it in; the hook only transports it.
  const openStudentsModal = useCallback(
    async (cls: ClassEntity, reservationDate: string) => {
      setViewingStudentsClass(cls);
      setLoadingStudents(true);
      try {
        const data = await classesService.getEnrolledStudents(cls.id, reservationDate);
        setStudents(data);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoadingStudents(false);
      }
    },
    [],
  );

  // Matches the page: closing clears only the viewed class, keeping `students`
  // until the next open replaces them.
  const closeStudentsModal = useCallback(() => {
    setViewingStudentsClass(null);
  }, []);

  return {
    classes: resource.data ?? [],
    loading: resource.loading,
    refetch: resource.refetch,
    viewingStudentsClass,
    students,
    loadingStudents,
    openStudentsModal,
    closeStudentsModal,
  };
}
