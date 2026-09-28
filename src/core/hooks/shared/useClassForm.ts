import { useState, useEffect, useCallback } from 'react';
import { usersService, classesService } from '@/core/services';
import { useAlert } from '@/ui/GlobalAlertProvider';
import { isTimeRangeValid } from '@/core/utils/validation';
import type { ClassEntity } from '@/core/types/classes.types';
import type { Specialty } from '@/core/types/users.types';

export interface UseClassFormOptions {
  initialData?: Partial<ClassEntity>;
  onSuccess?: () => void;
}

export interface UseClassFormResult {
  activityName: string;
  selectedDays: number[];
  startTime: string;
  endTime: string;
  teacher: string;
  maxCapacity: number;
  basePrice: number;
  teacherCommission: number;
  specialties: Specialty[];
  loading: boolean;
  error: string;
  setField: (field: string, value: string | number | number[]) => void;
  reset: () => void;
  handleSubmit: () => Promise<void>;
}

export function useClassForm({ initialData, onSuccess }: UseClassFormOptions = {}): UseClassFormResult {
  const { showError, showSuccess } = useAlert();

  const [activityName, setActivityName] = useState(initialData?.activity_name || '');
  const [selectedDays, setSelectedDays] = useState<number[]>(
    initialData?.day_of_week != null ? [initialData.day_of_week] : []
  );
  const [startTime, setStartTime] = useState(initialData?.start_time || '18:00');
  const [endTime, setEndTime] = useState(initialData?.end_time || '19:00');
  const [teacher, setTeacher] = useState(initialData?.teacher_id || '');
  const [maxCapacity, setMaxCapacity] = useState(initialData?.capacity || 15);
  const [basePrice, setBasePrice] = useState(initialData?.base_price || 5000);
  const [teacherCommission, setTeacherCommission] = useState(initialData?.teacher_commission_pct || 50);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    setActivityName(initialData?.activity_name || '');
    setSelectedDays(initialData?.day_of_week != null ? [initialData.day_of_week] : []);
    setStartTime(initialData?.start_time || '18:00');
    setEndTime(initialData?.end_time || '19:00');
    setTeacher(initialData?.teacher_id || '');
    setMaxCapacity(initialData?.capacity || 15);
    setBasePrice(initialData?.base_price || 5000);
    setTeacherCommission(initialData?.teacher_commission_pct || 50);
    setError('');
  }, [initialData]);

  useEffect(() => {
    reset();
  }, [initialData, reset]);

  useEffect(() => {
    let mounted = true;
    usersService
      .getSpecialties()
      .then((data) => {
        if (mounted) setSpecialties(data);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : 'Error cargando especialidades';
        setError(message);
        showError(`Error: ${message}`);
      });
    return () => {
      mounted = false;
    };
  }, [showError]);

  const setField = useCallback((field: string, value: string | number | number[]) => {
    switch (field) {
      case 'activityName':
        setActivityName(String(value));
        break;
      case 'selectedDays':
        setSelectedDays(value as number[]);
        break;
      case 'startTime':
        setStartTime(String(value));
        break;
      case 'endTime':
        setEndTime(String(value));
        break;
      case 'teacher':
        setTeacher(String(value));
        break;
      case 'maxCapacity':
        setMaxCapacity(Number(value));
        break;
      case 'basePrice':
        setBasePrice(Number(value));
        break;
      case 'teacherCommission':
        setTeacherCommission(Number(value));
        break;
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    setError('');
    if (!activityName.trim() || !teacher.trim()) {
      const message = 'Selecciona una actividad y una profesora.';
      setError(message);
      showError(`Error: ${message}`);
      return;
    }
    if (selectedDays.length === 0) {
      const message = 'Selecciona al menos un día de la semana.';
      setError(message);
      showError(`Error: ${message}`);
      return;
    }
    if (!isTimeRangeValid(startTime, endTime)) {
      setError('La hora de fin debe ser posterior a la de inicio.');
      showError('Error: La hora de fin debe ser posterior a la de inicio.');
      return;
    }

    setLoading(true);
    try {
      if (initialData?.id) {
        // Edit mode: update single class (keep its day)
        const payload: Partial<ClassEntity> = {
          activity_name: activityName,
          teacher_id: teacher,
          day_of_week: selectedDays[0],
          start_time: startTime,
          end_time: endTime,
          capacity: maxCapacity,
          base_price: basePrice,
          teacher_commission_pct: teacherCommission,
        };
        await classesService.updateClass(initialData.id, payload);
        showSuccess('Clase actualizada con éxito.');
      } else {
        // Create mode: one class per selected day
        const payload: Partial<ClassEntity> = {
          activity_name: activityName,
          teacher_id: teacher,
          start_time: startTime,
          end_time: endTime,
          capacity: maxCapacity,
          base_price: basePrice,
          teacher_commission_pct: teacherCommission,
        };
        await classesService.createClasses(payload, selectedDays);
        showSuccess(
          selectedDays.length === 1
            ? 'Clase creada con éxito.'
            : `${selectedDays.length} clases creadas con éxito.`
        );
      }
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      showError(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [
    activityName,
    teacher,
    startTime,
    endTime,
    selectedDays,
    maxCapacity,
    basePrice,
    teacherCommission,
    initialData,
    onSuccess,
    showError,
    showSuccess,
  ]);

  return {
    activityName,
    selectedDays,
    startTime,
    endTime,
    teacher,
    maxCapacity,
    basePrice,
    teacherCommission,
    specialties,
    loading,
    error,
    setField,
    reset,
    handleSubmit,
  };
}
