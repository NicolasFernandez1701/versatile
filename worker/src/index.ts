import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { buildPushPayload, sendPushNotification } from '@pushforge/builder';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  STUDIO_TIMEZONE: string;
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

interface EnrollmentRow {
  id?: string;
  student_id: string;
  class_id: string;
  classes: {
    id?: string;
    activity_name: string;
    start_time: string;
    teacher_id: string;
  } | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
}

export function buildDailySummaryPayload(
  count: number,
  classNames: string[]
): { title: string; body: string } {
  return {
    title: 'Resumen del día',
    body: `Hoy tenés ${count} clase(s): ${classNames.join(', ')}`,
  };
}

export function getPreClassWindow(now: Date): { today: string; nowTime: string; laterTime: string } {
  const sixtyMinLater = new Date(now.getTime() + 60 * 60000);
  return {
    today: now.toISOString().split('T')[0],
    nowTime: now.toISOString().slice(11, 19),
    laterTime: sixtyMinLater.toISOString().slice(11, 19),
  };
}

export function buildPreClassReminderPayload(
  className: string,
  startTime: string
): { title: string; body: string } {
  return {
    title: '¡Tu clase empieza pronto!',
    body: `${className} empieza a las ${startTime.slice(0, 5)}`,
  };
}

export function getPlanExpirationMilestoneDates(now: Date): string[] {
  return [1, 3, 7].map((days) => {
    const target = new Date(now);
    target.setDate(target.getDate() + days);
    return target.toISOString().split('T')[0];
  });
}

export function buildPlanExpirationPayload(days: number): { title: string; body: string } {
  return {
    title: 'Tu plan está por vencer',
    body: `Tu plan vence en ${days} día(s). Renová para seguir disfrutando.`,
  };
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const vapidKeys = {
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
    };

    await sendDailySummaries(supabase, vapidKeys, env.STUDIO_TIMEZONE);
    await sendPreClassReminders(supabase, vapidKeys);
    await sendPlanExpirationAlerts(supabase, vapidKeys);
  },
};

export async function sendDailySummaries(
  supabase: SupabaseClient,
  vapidKeys: { publicKey: string; privateKey: string },
  timezone: string
): Promise<void> {
  const now = new Date();
  const currentHour = now.toLocaleString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  });

  if (currentHour !== '08') return;

  const today = now.toLocaleDateString('en-CA', { timeZone: timezone });

  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('student_id, class_id, classes!inner(activity_name, start_time, teacher_id)')
    .eq('reservation_date', today);

  if (error || !enrollments?.length) return;

  const userClasses = new Map<string, { count: number; classNames: string[] }>();

  for (const e of enrollments as EnrollmentRow[]) {
    const className = e.classes?.activity_name ?? '';

    const studentClasses = userClasses.get(e.student_id) ?? { count: 0, classNames: [] };
    studentClasses.count++;
    studentClasses.classNames.push(className);
    userClasses.set(e.student_id, studentClasses);

    if (e.classes?.teacher_id) {
      const teacherClasses = userClasses.get(e.classes.teacher_id) ?? { count: 0, classNames: [] };
      teacherClasses.count++;
      teacherClasses.classNames.push(className);
      userClasses.set(e.classes.teacher_id, teacherClasses);
    }
  }

  for (const [userId, info] of userClasses) {
    if (info.count === 0) continue;

    const { title, body } = buildDailySummaryPayload(info.count, info.classNames);

    const { error: insertErr } = await supabase.from('notifications').insert({
      user_id: userId,
      type: 'daily_summary',
      title,
      body,
    });

    if (insertErr) continue;

    await sendPush(supabase, userId, { title, body }, vapidKeys);
  }
}

export async function sendPreClassReminders(
  supabase: SupabaseClient,
  vapidKeys: { publicKey: string; privateKey: string }
): Promise<void> {
  const now = new Date();
  const { today, nowTime, laterTime } = getPreClassWindow(now);

  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('id, student_id, class_id, classes!inner(id, activity_name, start_time, teacher_id)')
    .eq('reservation_date', today)
    .gte('classes.start_time', nowTime)
    .lte('classes.start_time', laterTime);

  if (error || !enrollments?.length) return;

  for (const e of enrollments as EnrollmentRow[]) {
    const className = e.classes?.activity_name ?? 'Clase';
    const startTime = e.classes?.start_time ?? '';
    const { title, body } = buildPreClassReminderPayload(className, startTime);

    await insertAndPush(supabase, e.student_id, 'pre_class_reminder', title, body, e.class_id, vapidKeys);

    if (e.classes?.teacher_id && e.classes.teacher_id !== e.student_id) {
      await insertAndPush(
        supabase,
        e.classes.teacher_id,
        'pre_class_reminder',
        title,
        body,
        e.class_id,
        vapidKeys
      );
    }
  }
}

export async function sendPlanExpirationAlerts(
  supabase: SupabaseClient,
  vapidKeys: { publicKey: string; privateKey: string }
): Promise<void> {
  const now = new Date();
  const milestones = [1, 3, 7];

  for (const days of milestones) {
    const target = new Date(now);
    target.setDate(target.getDate() + days);
    const targetDateStr = target.toISOString().split('T')[0];

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('plan_expiration_date', targetDateStr)
      .eq('role', 'student');

    if (error || !profiles?.length) continue;

    const { title, body } = buildPlanExpirationPayload(days);

    for (const p of profiles as ProfileRow[]) {
      await insertAndPush(supabase, p.id, 'plan_expiration', title, body, null, vapidKeys);
    }
  }
}

async function insertAndPush(
  supabase: SupabaseClient,
  userId: string,
  type: 'daily_summary' | 'pre_class_reminder' | 'plan_expiration',
  title: string,
  body: string,
  referenceId: string | null,
  vapidKeys: { publicKey: string; privateKey: string }
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    reference_id: referenceId,
  });

  if (error) return;

  await sendPush(supabase, userId, { title, body }, vapidKeys);
}

export async function sendPush(
  supabase: SupabaseClient,
  userId: string,
  payload: { title: string; body: string; url?: string },
  vapidKeys: { publicKey: string; privateKey: string }
): Promise<void> {
  const { data: subs, error } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId);

  if (error || !subs?.length) return;

  for (const sub of subs as PushSubscription[]) {
    try {
      const pushPayload = buildPushPayload(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
        },
        JSON.stringify(payload),
        {
          vapid: {
            subject: 'mailto:admin@versa.club',
            publicKey: vapidKeys.publicKey,
            privateKey: vapidKeys.privateKey,
          },
        }
      );

      const response = await sendPushNotification(pushPayload);

      if (response.status === 410 || response.status === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      }
    } catch {
      // Log but continue
    }
  }
}
