import { supabase } from '../services/supabase';
import type { PlanWithActivities, QuotaMap } from '../types/plans.types';

function toISODateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateQuotaPerActivity(
  plan: PlanWithActivities,
  daysRemaining: number,
  daysInMonth: number
): QuotaMap {
  const quotaMap: QuotaMap = {};

  for (const activity of plan.plan_activities) {
    const total = Math.ceil((activity.classes_per_week * 4 * daysRemaining) / daysInMonth);

    quotaMap[activity.activity_name] = {
      activity_id: activity.id,
      activity_name: activity.activity_name,
      total,
      consumed: 0,
      remaining: total,
    };
  }

  return quotaMap;
}

export function countConsumedByActivity(
  rows: Array<{ classes?: { activity_name?: string } | null }>
): Record<string, number> {
  const consumed: Record<string, number> = {};

  for (const row of rows) {
    const activityName = row.classes?.activity_name;
    if (!activityName) continue;

    consumed[activityName] = (consumed[activityName] ?? 0) + 1;
  }

  return consumed;
}

export function reconcileQuota(prorated: QuotaMap, consumed: Record<string, number>): QuotaMap {
  const result: QuotaMap = {};

  for (const [activityName, quota] of Object.entries(prorated)) {
    const consumedCount = consumed[activityName] ?? 0;
    const remaining = Math.max(0, quota.total - consumedCount);

    result[activityName] = {
      ...quota,
      consumed: consumedCount,
      remaining,
    };
  }

  return result;
}

export async function getRemainingQuota(
  profileId: string,
  _planId: string,
  plan: PlanWithActivities,
  monthStart: Date,
  monthEnd: Date
): Promise<QuotaMap> {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - today.getDate() + 1;

  const monthStartStr = toISODateLocal(monthStart);
  const monthEndStr = toISODateLocal(monthEnd);

  const { data, error } = await supabase
    .from('enrollments')
    .select('classes(activity_name)')
    .eq('student_id', profileId)
    .gte('reservation_date', monthStartStr)
    .lte('reservation_date', monthEndStr)
    .neq('attendance_status', 'cancelled');

  if (error) throw error;

  const consumed = countConsumedByActivity((data ?? []) as Array<{ classes?: { activity_name?: string } | null }>);
  const prorated = calculateQuotaPerActivity(plan, daysRemaining, daysInMonth);

  return reconcileQuota(prorated, consumed);
}
