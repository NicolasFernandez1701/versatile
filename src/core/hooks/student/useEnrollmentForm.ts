import { useState, useCallback } from 'react';
import { usersService, classesService, enrollmentsService } from '@/core/services';
import { useAlert } from '@/ui/useAlert';
import { useAsyncResource } from '@/core/hooks/shared/useAsyncResource';
import type { UserProfile } from '@/core/types/users.types';
import type { ClassEntity } from '@/core/types/classes.types';

export interface UseEnrollmentFormOptions {
  studioId: string;
  onSuccess?: () => void;
}

export interface UseEnrollmentFormResult {
  query: string;
  results: UserProfile[];
  selectedStudent: string;
  studentDropdownOpen: boolean;
  selectedClass: string;
  classDropdownOpen: boolean;
  classes: ClassEntity[];
  loading: boolean;
  error: string;
  reservationDate: string;
  searchStudents: (query: string) => void;
  selectStudent: (student: UserProfile) => void;
  selectClass: (cls: ClassEntity) => void;
  setSelectedClass: (id: string) => void;
  setStudentDropdownOpen: (open: boolean) => void;
  setClassDropdownOpen: (open: boolean) => void;
  setReservationDate: (date: string) => void;
  handleSubmit: () => Promise<void>;
}

interface EnrollmentFormResource {
  students: UserProfile[];
  classes: ClassEntity[];
}

export function useEnrollmentForm({
  studioId,
  onSuccess,
}: UseEnrollmentFormOptions): UseEnrollmentFormResult {
  const { showError, showSuccess } = useAlert();

  const resource = useAsyncResource<EnrollmentFormResource>(
    async () => {
      const [loadedStudents, loadedClasses] = await Promise.all([
        usersService.getStudents(studioId),
        classesService.getClasses(studioId),
      ]);
      return { students: loadedStudents, classes: loadedClasses };
    },
    [studioId],
    {
      onError: (error) => {
        showError(`Error: ${error.message}`);
      },
    },
  );

  const students = resource.data?.students ?? [];
  const classes = resource.data?.classes ?? [];

  const [query, setQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [reservationDate, setReservationDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Derived from (students, query): typing before the fetch resolves is never
  // overwritten by the late full list (delta #6) — the filter simply applies
  // to whatever has loaded so far.
  const term = query.toLowerCase();
  const results = query === '' ? students : students.filter((s) => s.full_name?.toLowerCase().includes(term));

  const loading = resource.loading || submitLoading;
  const error = submitError || resource.error?.message || '';

  const searchStudents = useCallback((value: string) => {
    setQuery(value);
    setStudentDropdownOpen(true);
  }, []);

  const selectStudent = useCallback((student: UserProfile) => {
    setQuery(student.full_name || '');
    setSelectedStudent(student.id);
    setStudentDropdownOpen(false);
  }, []);

  const selectClass = useCallback((cls: ClassEntity) => {
    setSelectedClass(cls.id);
    setClassDropdownOpen(false);
  }, []);

  const setSelectedClassId = useCallback((id: string) => {
    setSelectedClass(id);
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitError('');
    if (!selectedStudent) {
      setSubmitError('Selecciona un alumno');
      showError('Por favor selecciona un alumno válido de la lista.');
      return;
    }
    if (!selectedClass) {
      setSubmitError('Selecciona una clase');
      showError('Por favor selecciona una clase válida de la lista.');
      return;
    }

    setSubmitLoading(true);
    try {
      await enrollmentsService.enrollStudent(selectedStudent, selectedClass, reservationDate);
      showSuccess('Alumno inscripto correctamente.');
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al inscribir alumno';
      setSubmitError(message);
      showError(`Error: ${message}`);
    } finally {
      setSubmitLoading(false);
    }
  }, [selectedStudent, selectedClass, reservationDate, onSuccess, showError, showSuccess]);

  return {
    query,
    results,
    selectedStudent,
    studentDropdownOpen,
    selectedClass,
    classDropdownOpen,
    classes,
    loading,
    error,
    reservationDate,
    searchStudents,
    selectStudent,
    selectClass,
    setSelectedClass: setSelectedClassId,
    setStudentDropdownOpen,
    setClassDropdownOpen,
    setReservationDate,
    handleSubmit,
  };
}
