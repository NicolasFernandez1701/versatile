import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useAlert } from '@/ui/GlobalAlertProvider';
import { classesService, usersService } from '@/core/services';
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

export function useClassesManagement(): UseClassesManagementResult {
  const { current_studio_id } = useAuthStore();
  const { showError, showSuccess } = useAlert();

  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewingStudentsClass, setViewingStudentsClass] = useState<ClassEntity | null>(null);
  const [students, setStudents] = useState<EnrollmentEntity[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fetchClasses = useCallback(async () => {
    if (!current_studio_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [classesData, teachersData] = await Promise.all([
        classesService.getClasses(current_studio_id),
        usersService.getTeachers(current_studio_id),
      ]);
      setClasses(classesData);
      setTeachers(teachersData);
    } catch (error: unknown) {
      showError('Error cargando las clases.');
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  }, [current_studio_id, showError]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const createClass = useCallback(
    async (payload: Partial<ClassEntity>) => {
      try {
        await classesService.createClass(payload);
        await fetchClasses();
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
        showSuccess('Clase eliminada con éxito.');
      } catch (error: unknown) {
        showError('Error eliminando la clase.');
      }
    },
    [fetchClasses, showError, showSuccess],
  );

  const toggleStatus = useCallback(
    async (id: string, currentStatus: boolean) => {
      const nextStatus = !currentStatus;
      setClasses((prev) =>
        prev.map((cls) => (cls.id === id ? { ...cls, is_active: nextStatus } : cls)),
      );

      try {
        await classesService.updateClass(id, { is_active: nextStatus });
        showSuccess('Estado actualizado con éxito.');
      } catch (error: unknown) {
        setClasses((prev) =>
          prev.map((cls) => (cls.id === id ? { ...cls, is_active: currentStatus } : cls)),
        );
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
