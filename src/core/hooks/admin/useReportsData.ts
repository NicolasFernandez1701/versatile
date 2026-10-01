import { reportsService } from '@/core/services';
import { useAsyncResource } from '@/core/hooks/shared/useAsyncResource';
import type {
  AttendanceByStudent,
  AttendanceByClass,
  RevenueByMonth,
  PopularClass,
  TeacherCommission,
  RetentionMetric,
  ReportTab,
} from '@/core/types/reports.types';

type ReportSnapshot =
  | { tab: 'attendance-student'; rows: AttendanceByStudent[] }
  | { tab: 'attendance-class'; rows: AttendanceByClass[] }
  | { tab: 'revenue'; rows: RevenueByMonth[] }
  | { tab: 'popular'; rows: PopularClass[] }
  | { tab: 'commissions'; rows: TeacherCommission[] }
  | { tab: 'retention'; rows: RetentionMetric[] };

export interface UseReportsDataResult {
  attendanceByStudent: AttendanceByStudent[];
  attendanceByClass: AttendanceByClass[];
  revenue: RevenueByMonth[];
  popular: PopularClass[];
  commissions: TeacherCommission[];
  retention: RetentionMetric[];
  loading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Reports-page data access. Extracted from ReportsPage so the page stops
 * importing the services layer. Runtime contract mirrors the page's previous
 * `loadData`: a blocking reload per tab/date-range change, a single active
 * report at a time, and `console.error('Error loading report:', error)` with
 * no toast on failure.
 *
 * The fetcher returns a discriminated snapshot tagged with its tab (AD-10) so
 * a response can only ever be routed into the array that matches its own tab.
 */
export function useReportsData(
  activeTab: ReportTab,
  dateRange: { start: string; end: string },
): UseReportsDataResult {
  const resource = useAsyncResource<ReportSnapshot>(
    async (): Promise<ReportSnapshot> => {
      switch (activeTab) {
        case 'attendance-student':
          return {
            tab: 'attendance-student',
            rows: await reportsService.getAttendanceByStudent(dateRange.start, dateRange.end),
          };
        case 'attendance-class':
          return {
            tab: 'attendance-class',
            rows: await reportsService.getAttendanceByClass(dateRange.start, dateRange.end),
          };
        case 'revenue':
          return { tab: 'revenue', rows: await reportsService.getRevenueByMonth(12) };
        case 'popular':
          return { tab: 'popular', rows: await reportsService.getPopularClasses() };
        case 'commissions':
          return {
            tab: 'commissions',
            rows: await reportsService.getTeacherCommissions(dateRange.start, dateRange.end),
          };
        case 'retention':
          return { tab: 'retention', rows: await reportsService.getRetentionMetrics() };
      }
    },
    [activeTab, dateRange.start, dateRange.end],
    {
      // The page had no toast here: it logged the raw error and nothing else.
      onError: (error) => {
        console.error('Error loading report:', error);
      },
    },
  );

  const snapshot = resource.data;

  return {
    attendanceByStudent: snapshot?.tab === 'attendance-student' ? snapshot.rows : [],
    attendanceByClass: snapshot?.tab === 'attendance-class' ? snapshot.rows : [],
    revenue: snapshot?.tab === 'revenue' ? snapshot.rows : [],
    popular: snapshot?.tab === 'popular' ? snapshot.rows : [],
    commissions: snapshot?.tab === 'commissions' ? snapshot.rows : [],
    retention: snapshot?.tab === 'retention' ? snapshot.rows : [],
    loading: resource.loading,
    refetch: resource.refetch,
  };
}
