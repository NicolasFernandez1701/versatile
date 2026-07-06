import { useState, useEffect } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { classesService } from '@/core/services';
import type { ClassEntity } from '@/core/types/classes.types';

export interface UseTeacherClassesResult {
  classes: ClassEntity[];
  loading: boolean;
  selectedClass: ClassEntity | null;
  setSelectedClass: (cls: ClassEntity) => void;
  activeTab: 'asistencia' | 'padron';
  setActiveTab: (tab: 'asistencia' | 'padron') => void;
  todayStr: string;
}

export function useTeacherClasses(): UseTeacherClassesResult {
  const { user } = useAuthStore();

  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassEntity | null>(null);
  const [activeTab, setActiveTab] = useState<'asistencia' | 'padron'>('asistencia');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (user?.id) {
      classesService
        .getClassesByTeacher(user.id)
        .then((data) => {
          setClasses(data);
          const today = new Date().getDay();
          const todayClass = data.find((c) => c.day_of_week === today);
          if (todayClass) setSelectedClass(todayClass);
          else if (data.length > 0) setSelectedClass(data[0]);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user?.id]);

  return {
    classes,
    loading,
    selectedClass,
    setSelectedClass,
    activeTab,
    setActiveTab,
    todayStr,
  };
}
