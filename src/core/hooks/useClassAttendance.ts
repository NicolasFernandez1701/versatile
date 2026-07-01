import { useState, useEffect, useCallback } from 'react';
import { attendanceService } from '@/core/services';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import type { ClassEntity } from '@/core/types/classes.types';
import type { EnrollmentEntity } from '@/core/types/enrollments.types';
import type { AttendanceRecord } from '@/core/types/attendance.types';

export interface UseClassAttendanceParams {
  selectedClass: ClassEntity | null;
  activeTab: 'asistencia' | 'padron';
  todayStr: string;
}

export interface UseClassAttendanceResult {
  enrollments: EnrollmentEntity[];
  attendances: AttendanceRecord[];
  loadingDetails: boolean;
  handleToggleAttendance: (record: AttendanceRecord, newStatus: 'present' | 'absent') => Promise<void>;
}

export function useClassAttendance({
  selectedClass,
  activeTab,
  todayStr,
}: UseClassAttendanceParams): UseClassAttendanceResult {
  const { showSuccess, showError } = useAlert();

  const [enrollments, setEnrollments] = useState<EnrollmentEntity[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadDetails = useCallback(
    async (classId: string) => {
      try {
        setLoadingDetails(true);
        if (activeTab === 'padron') {
          const data = await attendanceService.getClassEnrollments(classId);
          setEnrollments(data);
        } else {
          const data = await attendanceService.getClassAttendanceByDate(classId, todayStr);
          setAttendances(data);
        }
      } catch (error: unknown) {
        showError(error instanceof Error ? error.message : 'Error cargando detalles');
      } finally {
        setLoadingDetails(false);
      }
    },
    [activeTab, todayStr, showError],
  );

  useEffect(() => {
    if (selectedClass) {
      loadDetails(selectedClass.id);
    }
  }, [selectedClass, activeTab, loadDetails]);

  const handleToggleAttendance = useCallback(
    async (attendanceRecord: AttendanceRecord, newStatus: 'present' | 'absent') => {
      try {
        setAttendances((prev) =>
          prev.map((a) => (a.id === attendanceRecord.id ? { ...a, status: newStatus } : a)),
        );
        await attendanceService.markAttendance(
          attendanceRecord.enrollment_id,
          todayStr,
          newStatus,
        );
        showSuccess(`Asistencia marcada como ${newStatus === 'present' ? 'Presente' : 'Ausente'}`);
      } catch (error: unknown) {
        showError(
          `Error al marcar asistencia: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        );
        if (selectedClass) {
          loadDetails(selectedClass.id);
        }
      }
    },
    [todayStr, selectedClass, loadDetails, showSuccess, showError],
  );

  return {
    enrollments,
    attendances,
    loadingDetails,
    handleToggleAttendance,
  };
}
