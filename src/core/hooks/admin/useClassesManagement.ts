import { useState, useCallback } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useAlert } from '@/ui/useAlert';
import { classesService, usersService } from '@/core/services';
import { useAsyncResource } from '@/core/hooks/shared/useAsyncResource';
import type { ClassEntity, EnrollmentEntity, Profile } from '@/core/types/classes.types';

export interface UseClassesManagementResult {
  classes: ClassEntity[];
  teachers: Profile[];
  loading: boolean;
  viewingStudentsClass: ClassEntity | null;
  students: EnrollmentEntity[];
  loadingStudents: boolean;
  fetchClasses: () => Promise<void>;
  createClass: (payload: Partial<ClassEntity>) => Promise<void>;
  updateClass: (id: string, payload: Partial<ClassEntity>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  toggleStatus: (id: string, currentStatus: boolean) => Promise<void>;
  openStudentsModal: (cls: ClassEntity) => Promise<void>;
  closeStudentsModal: () => void;
}

interface ClassesResource {
  classes: ClassEntity[];
  teachers: Profile[];
}

export function useClassesManagement(): UseClassesManagementResult {
  const { current_studio_id } = useAuthStore();
  const { showError, showSuccess } = useAlert();

  const resource = useAsyncResource<ClassesResource>(
    async () => {
      if (!current_studio_id) {
        throw new Error('useClassesManagement requires a studio id');
      }
      const [classesData, teachersData] = await Promise.all([
        classesService.getClasses(current_studio_id),
        usersService.getTeachers(current_studio_id),
      ]);
      return { classes: classesData, teachers: teachersData };
    },
    [current_studio_id],
    {
      enabled: !!current_studio_id,
      onError: (error) => {
        showError('Error cargando las clases.');
        console.error('Error fetching classes:', error);
      },
    },
  );

  const fetchClasses = resource.refetch;

  // Optimistic status overrides: toggleStatus applies instantly and keeps its
  // value. The override map is cleared right AFTER a refetch lands in the three
  // mutation paths below (create/update/delete), so the refresh reveals the
  // server value without flickering; a failed toggle drops only its own key.
  // Known gap: an external `fetchClasses()` call does not clear the map, so in
  // that case an override survives the refresh until the next mutation settles.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, boolean>>({});

  const classes = (resource.data?.classes ?? []).map((cls) => {
    const override = statusOverrides[cls.id];
    return override === undefined ? cls : { ...cls, is_active: override };
  });
  const teachers = resource.data?.teachers ?? [];
  const loading = resource.loading;

  const [viewingStudentsClass, setViewingStudentsClass] = useState<ClassEntity | null>(null);
  const [students, setStudents] = useState<EnrollmentEntity[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const createClass = useCallback(
    async (payload: Partial<ClassEntity>) => {
      try {
        await classesService.createClass(payload);
        await fetchClasses();
        setStatusOverrides({});
        showSuccess('Clase creada con éxito.');
      } catch (error: unknown) {
        showError(error instanceof Error ? error.message : 'Error creando la clase.');
      }
    },
    [fetchClasses, showError, showSuccess],
  );

  const updateClass = useCallback(
    async (id: string, payload: Partial<ClassEntity>) => {
      try {
        await classesService.updateClass(id, payload);
        await fetchClasses();
        setStatusOverrides({});
        showSuccess('Clase actualizada con éxito.');
      } catch (error: unknown) {
        showError(error instanceof Error ? error.message : 'Error actualizando la clase.');
      }
    },
    [fetchClasses, showError, showSuccess],
  );

  const deleteClass = useCallback(
    async (id: string) => {
      try {
        await classesService.deleteClass(id);
        await fetchClasses();
        setStatusOverrides({});
        showSuccess('Clase eliminada con éxito.');
      } catch {
        showError('Error eliminando la clase.');
      }
    },
    [fetchClasses, showError, showSuccess],
  );

  const toggleStatus = useCallback(
    async (id: string, currentStatus: boolean) => {
      const nextStatus = !currentStatus;
      setStatusOverrides((prev) => ({ ...prev, [id]: nextStatus }));

      try {
        await classesService.updateClass(id, { is_active: nextStatus });
        showSuccess('Estado actualizado con éxito.');
      } catch {
        setStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        showError('Error actualizando el estado.');
      }
    },
    [showError, showSuccess],
  );

  const openStudentsModal = useCallback(
    async (cls: ClassEntity) => {
      setViewingStudentsClass(cls);
      setLoadingStudents(true);
      try {
        const data = await classesService.getEnrolledStudents(cls.id);
        setStudents(data);
      } catch (error: unknown) {
        showError('Error cargando los alumnos inscritos.');
        console.error('Error fetching students:', error);
      } finally {
        setLoadingStudents(false);
      }
    },
    [showError],
  );

  const closeStudentsModal = useCallback(() => {
    setViewingStudentsClass(null);
    setStudents([]);
  }, []);

  return {
    classes,
    teachers,
    loading,
    viewingStudentsClass,
    students,
    loadingStudents,
    fetchClasses,
    createClass,
    updateClass,
    deleteClass,
    toggleStatus,
    openStudentsModal,
    closeStudentsModal,
  };
}
