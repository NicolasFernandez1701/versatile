import { useState, useEffect, useCallback } from 'react';
import { usersService, classesService, enrollmentsService } from '@/core/services';
import { useAlert } from '@/ui/GlobalAlertProvider';
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

export function useEnrollmentForm({
  studioId,
  onSuccess,
}: UseEnrollmentFormOptions): UseEnrollmentFormResult {
  const { showError, showSuccess } = useAlert();

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [reservationDate, setReservationDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([usersService.getStudents(studioId), classesService.getClasses(studioId)])
      .then(([loadedStudents, loadedClasses]) => {
        if (!mounted) return;
        setStudents(loadedStudents);
        setClasses(loadedClasses);
        setResults(loadedStudents);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : 'Error cargando datos';
        setError(message);
        showError(`Error: ${message}`);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [studioId, showError]);

  const searchStudents = useCallback(
    (value: string) => {
      setQuery(value);
      setStudentDropdownOpen(true);
      const term = value.toLowerCase();
      setResults(students.filter((s) => s.full_name?.toLowerCase().includes(term)));
    },
    [students],
  );

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
    setError('');
    if (!selectedStudent) {
      setError('Selecciona un alumno');
      showError('Por favor selecciona un alumno válido de la lista.');
      return;
    }
    if (!selectedClass) {
      setError('Selecciona una clase');
      showError('Por favor selecciona una clase válida de la lista.');
      return;
    }

    setLoading(true);
    try {
      await enrollmentsService.enrollStudent(selectedStudent, selectedClass, reservationDate);
      showSuccess('Alumno inscripto correctamente.');
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al inscribir alumno';
      setError(message);
      showError(`Error: ${message}`);
    } finally {
      setLoading(false);
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
