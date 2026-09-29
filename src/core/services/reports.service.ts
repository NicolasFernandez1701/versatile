import { supabase } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import type {
  AttendanceByStudent,
  AttendanceByClass,
  RevenueByMonth,
  PopularClass,
  TeacherCommission,
  RetentionMetric,
} from '../types/reports.types';

type AttendanceStatus = 'attended' | 'absent' | 'cancelled';

interface AttendanceCounts {
  attended: number;
  absent: number;
  cancelled: number;
}

function createEmptyCounts(): AttendanceCounts {
  return { attended: 0, absent: 0, cancelled: 0 };
}

function tallyAttendance(counts: AttendanceCounts, status: AttendanceStatus): AttendanceCounts {
  switch (status) {
    case 'attended':
      return { ...counts, attended: counts.attended + 1 };
    case 'absent':
      return { ...counts, absent: counts.absent + 1 };
    case 'cancelled':
      return { ...counts, cancelled: counts.cancelled + 1 };
    default:
      return counts;
  }
}

function attendanceRate(attended: number, total: number): number {
  return total > 0 ? Math.round((attended / total) * 100) : 0;
}

interface ProfileJoin {
  full_name: string;
}

interface ClassJoin {
  activity_name: string;
  day_of_week: number;
}

interface PopularClassJoin {
  activity_name: string;
}

// Supabase infers embedded to-one joins as arrays; PostgREST returns a single
// object for them at runtime. These helpers make that explicit: object shapes
// pass through untouched, array shapes resolve to their first row.
function resolveProfileName(profiles: ProfileJoin | ProfileJoin[] | null | undefined): string {
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  return profile?.full_name || 'Desconocido';
}

function resolveClassJoin(classes: ClassJoin | ClassJoin[] | null | undefined): ClassJoin | null {
  const cls = Array.isArray(classes) ? classes[0] : classes;
  return cls ?? null;
}

function resolvePopularJoin(
  classes: PopularClassJoin | PopularClassJoin[] | null | undefined
): PopularClassJoin | null {
  const cls = Array.isArray(classes) ? classes[0] : classes;
  return cls ?? null;
}

export const reportsService = {
  async getAttendanceByStudent(
    startDate: string,
    endDate: string
  ): Promise<AttendanceByStudent[]> {
    const studioId = useAuthStore.getState().current_studio_id;
    if (!studioId) throw new Error('No active studio');

    const { data, error } = await supabase
      .from('enrollments')
      .select('student_id, attendance_status, profiles(full_name)')
      .eq('studio_id', studioId)
      .gte('reservation_date', startDate)
      .lte('reservation_date', endDate);

    if (error) throw error;

    const map = new Map<string, AttendanceByStudent>();

    for (const row of data || []) {
      const id = row.student_id;
      if (!map.has(id)) {
        map.set(id, {
          student_id: id,
          full_name: resolveProfileName(row.profiles as ProfileJoin | ProfileJoin[] | null),
          ...createEmptyCounts(),
          total: 0,
        });
      }
      const entry = map.get(id)!;
      entry.total++;
      const counts = tallyAttendance(
        { attended: entry.attended, absent: entry.absent, cancelled: entry.cancelled },
        row.attendance_status as AttendanceStatus
      );
      entry.attended = counts.attended;
      entry.absent = counts.absent;
      entry.cancelled = counts.cancelled;
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  },

  async getAttendanceByClass(
    startDate: string,
    endDate: string
  ): Promise<AttendanceByClass[]> {
    const studioId = useAuthStore.getState().current_studio_id;
    if (!studioId) throw new Error('No active studio');

    const { data, error } = await supabase
      .from('enrollments')
      .select('class_id, attendance_status, classes(activity_name, day_of_week)')
      .eq('studio_id', studioId)
      .gte('reservation_date', startDate)
      .lte('reservation_date', endDate);

    if (error) throw error;

    const map = new Map<string, AttendanceByClass>();

    for (const row of data || []) {
      const id = row.class_id;
      const cls = resolveClassJoin(row.classes as ClassJoin | ClassJoin[] | null);
      if (!cls) continue;

      if (!map.has(id)) {
        map.set(id, {
          class_id: id,
          activity_name: cls.activity_name,
          day_of_week: cls.day_of_week,
          total_enrolled: 0,
          ...createEmptyCounts(),
          attendance_rate: 0,
        });
      }
      const entry = map.get(id)!;
      entry.total_enrolled++;
      const counts = tallyAttendance(
        { attended: entry.attended, absent: entry.absent, cancelled: entry.cancelled },
        row.attendance_status as AttendanceStatus
      );
      entry.attended = counts.attended;
      entry.absent = counts.absent;
      entry.cancelled = counts.cancelled;
    }

    return Array.from(map.values())
      .map((e) => ({
        ...e,
        attendance_rate: attendanceRate(e.attended, e.total_enrolled),
      }))
      .sort((a, b) => b.total_enrolled - a.total_enrolled);
  },

  async getRevenueByMonth(months: number = 12): Promise<RevenueByMonth[]> {
    const studioId = useAuthStore.getState().current_studio_id;
    if (!studioId) throw new Error('No active studio');

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const startDate = start.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('payments')
      .select('payment_date, amount')
      .eq('studio_id', studioId)
      .gte('payment_date', startDate)
      .order('payment_date', { ascending: true });

    if (error) throw error;

    const monthlyMap = new Map<string, number>();

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, 0);
    }

    for (const row of data || []) {
      const d = new Date(row.payment_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(row.amount));
    }

    return Array.from(monthlyMap.entries()).map(([month, total]) => ({ month, total }));
  },

  async getPopularClasses(): Promise<PopularClass[]> {
    const studioId = useAuthStore.getState().current_studio_id;
    if (!studioId) throw new Error('No active studio');

    const { data, error } = await supabase
      .from('enrollments')
      .select('classes(activity_name)')
      .eq('studio_id', studioId);

    if (error) throw error;

    const map = new Map<string, number>();

    for (const row of data || []) {
      const cls = resolvePopularJoin(row.classes as PopularClassJoin | PopularClassJoin[] | null);
      if (!cls) continue;
      map.set(cls.activity_name, (map.get(cls.activity_name) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([activity_name, enrollment_count]) => ({ activity_name, enrollment_count }))
      .sort((a, b) => b.enrollment_count - a.enrollment_count);
  },

  async getTeacherCommissions(
    startDate: string,
    endDate: string
  ): Promise<TeacherCommission[]> {
    const studioId = useAuthStore.getState().current_studio_id;
    if (!studioId) throw new Error('No active studio');

    const { data, error } = await supabase
      .from('commissions')
      .select('teacher_id, amount_earned, profiles(full_name)')
      .eq('studio_id', studioId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    const map = new Map<string, TeacherCommission>();

    for (const row of data || []) {
      const id = row.teacher_id;
      if (!map.has(id)) {
        map.set(id, {
          teacher_id: id,
          full_name: resolveProfileName(row.profiles as ProfileJoin | ProfileJoin[] | null),
          total_earned: 0,
          class_count: 0,
        });
      }
      const entry = map.get(id)!;
      entry.total_earned += Number(row.amount_earned);
      entry.class_count++;
    }

    return Array.from(map.values()).sort((a, b) => b.total_earned - a.total_earned);
  },

  async getRetentionMetrics(): Promise<RetentionMetric[]> {
    const studioId = useAuthStore.getState().current_studio_id;
    if (!studioId) throw new Error('No active studio');

    const { data, error } = await supabase
      .from('enrollments')
      .select('student_id, reservation_date, profiles(full_name)')
      .eq('studio_id', studioId)
      .order('reservation_date', { ascending: false });

    if (error) throw error;

    const map = new Map<string, RetentionMetric>();
    const today = new Date();

    for (const row of data || []) {
      const id = row.student_id;
      if (!map.has(id)) {
        const lastDate = new Date(row.reservation_date);
        const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        map.set(id, {
          student_id: id,
          full_name: resolveProfileName(row.profiles as ProfileJoin | ProfileJoin[] | null),
          last_attendance: row.reservation_date,
          days_since_last: diffDays,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.days_since_last - a.days_since_last);
  },
};
