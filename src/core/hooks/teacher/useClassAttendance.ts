import { useState, useCallback } from 'react';
import { attendanceService } from '@/core/services';
import { useAlert } from '@/ui/useAlert';
import { useAsyncResource } from '@/core/hooks/shared/useAsyncResource';
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

  // Stable scalar id: fetching depends on the id string, so keying on it
  // (rather than the whole class object) also avoids refetching when the
  // parent recreates an identical object each render.
  const classId = selectedClass?.id;

  const enrollmentsResource = useAsyncResource<EnrollmentEntity[]>(
    async () => {
      if (!classId) {
        throw new Error('useClassAttendance requires a class id');
      }
      return attendanceService.getClassEnrollments(classId);
    },
    [classId],
    {
      enabled: !!selectedClass && activeTab === 'padron',
    },
  );

  const attendancesResource = useAsyncResource<AttendanceRecord[]>(
    async () => {
      if (!classId) {
        throw new Error('useClassAttendance requires a class id');
      }
      return attendanceService.getClassAttendanceByDate(classId, todayStr);
    },
    [classId, todayStr],
    {
      enabled: !!selectedClass && activeTab === 'asistencia',
    },
  );

  // Destructure the stable refetch before the callback so the failure path
  // below introduces no new exhaustive-deps warning.
  const { refetch: refetchAttendances } = attendancesResource;

  // Optimistic status overrides: the toggle applies instantly and keeps the
  // value (the previous local-state behavior never re-read the server value
  // on success). A failed toggle drops its override and reloads the server
  // values, revealing the authoritative state.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, 'present' | 'absent'>>({});

  const enrollments = enrollmentsResource.data ?? [];
  const attendances = (attendancesResource.data ?? []).map((record) => {
    const override = statusOverrides[record.id];
    return override === undefined ? record : { ...record, status: override };
  });
  const loadingDetails = enrollmentsResource.loading || attendancesResource.loading;

  const handleToggleAttendance = useCallback(
    async (attendanceRecord: AttendanceRecord, newStatus: 'present' | 'absent') => {
      setStatusOverrides((prev) => ({ ...prev, [attendanceRecord.id]: newStatus }));
      try {
        await attendanceService.markAttendance(
          attendanceRecord.enrollment_id,
          todayStr,
          newStatus,
        );
        showSuccess(`Asistencia marcada como ${newStatus === 'present' ? 'Presente' : 'Ausente'}`);
      } catch (error: unknown) {
        setStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[attendanceRecord.id];
          return next;
        });
        showError(
          `Error al marcar asistencia: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        );
        if (selectedClass) {
          refetchAttendances();
        }
      }
    },
    [todayStr, selectedClass, refetchAttendances, showSuccess, showError],
  );

  return {
    enrollments,
    attendances,
    loadingDetails,
    handleToggleAttendance,
  };
}
