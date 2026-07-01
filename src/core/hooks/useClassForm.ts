import { useState, useEffect, useCallback } from 'react';
import { usersService, classesService } from '@/core/services';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { isTimeRangeValid } from '@/core/utils/validation';
import type { ClassEntity } from '@/core/types/classes.types';
import type { Specialty } from '@/core/types/users.types';

export interface UseClassFormOptions {
  initialData?: Partial<ClassEntity>;
  onSuccess?: () => void;
}

export interface UseClassFormResult {
  activityName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  teacher: string;
  maxCapacity: number;
  basePrice: number;
  teacherCommission: number;
  specialties: Specialty[];
  loading: boolean;
  error: string;
  setField: (field: string, value: string | number) => void;
  reset: () => void;
  handleSubmit: () => Promise<void>;
}

export function useClassForm({ initialData, onSuccess }: UseClassFormOptions = {}): UseClassFormResult {
  const { showError, showSuccess } = useAlert();

  const [activityName, setActivityName] = useState(initialData?.activity_name || '');
  const [dayOfWeek, setDayOfWeek] = useState(initialData?.day_of_week ?? 1);
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
    setDayOfWeek(initialData?.day_of_week ?? 1);
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

  const setField = useCallback((field: string, value: string | number) => {
    switch (field) {
      case 'activityName':
        setActivityName(String(value));
        break;
      case 'dayOfWeek':
        setDayOfWeek(Number(value));
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
    if (!isTimeRangeValid(startTime, endTime)) {
      setError('La hora de fin debe ser posterior a la de inicio.');
      showError('Error: La hora de fin debe ser posterior a la de inicio.');
      return;
    }

    setLoading(true);
    try {
      const payload: Partial<ClassEntity> = {
        activity_name: activityName,
        teacher_id: teacher,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        capacity: maxCapacity,
        base_price: basePrice,
        teacher_commission_pct: teacherCommission,
      };

      if (initialData?.id) {
        await classesService.updateClass(initialData.id, payload);
        showSuccess('Clase actualizada con éxito.');
      } else {
        await classesService.createClass(payload);
        showSuccess('Clase creada con éxito.');
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
    dayOfWeek,
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
    dayOfWeek,
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
