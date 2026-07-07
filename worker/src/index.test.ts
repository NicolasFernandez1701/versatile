import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@pushforge/builder', () => ({
  buildPushHTTPRequest: vi.fn(),
}));

import {
  sendDailySummaries,
  sendPreClassReminders,
  sendPlanExpirationAlerts,
  sendPush,
  buildDailySummaryPayload,
  getPreClassWindow,
  buildPreClassReminderPayload,
  getPlanExpirationMilestoneDates,
  buildPlanExpirationPayload,
} from './index';
import { buildPushHTTPRequest } from '@pushforge/builder';

const mockBuildPushHTTPRequest = buildPushHTTPRequest as ReturnType<typeof vi.fn>;

const privateJWK = '{"kty":"EC","crv":"P-256","x":"test","y":"test","d":"test"}';

function createMockSupabaseClient(options: {
  enrollmentsData?: unknown[] | null;
  enrollmentsError?: Error | null;
  insertError?: Error | null;
  profilesData?: unknown[] | null;
  profilesError?: Error | null;
  subscriptionsData?: unknown[] | null;
  subscriptionsError?: Error | null;
  deleteError?: Error | null;
} = {}) {
  const insertMock = vi.fn().mockResolvedValue({ error: options.insertError ?? null });
  const deleteEqMock = vi.fn().mockResolvedValue({ error: options.deleteError ?? null });

  const fromMock = vi.fn((table: string) => {
    if (table === 'enrollments') {
      return {
        select: vi.fn((_columns: string) => {
          const isPreClassQuery = _columns.includes('classes!inner(id');

          return {
            eq: vi.fn(() => {
              if (isPreClassQuery) {
                return {
                  gte: vi.fn(() => ({
                    lte: vi.fn().mockResolvedValue({
                      data: options.enrollmentsData ?? null,
                      error: options.enrollmentsError ?? null,
                    }),
                  })),
                };
              }

              return Promise.resolve({
                data: options.enrollmentsData ?? null,
                error: options.enrollmentsError ?? null,
              });
            }),
          };
        }),
      };
    }

    if (table === 'profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: options.profilesData ?? null,
              error: options.profilesError ?? null,
            }),
          })),
        })),
      };
    }

    if (table === 'push_subscriptions') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: options.subscriptionsData ?? null,
            error: options.subscriptionsError ?? null,
          }),
        })),
        delete: vi.fn(() => ({ eq: deleteEqMock })),
      };
    }

    if (table === 'notifications') {
      return { insert: insertMock };
    }

    return {};
  });

  return { from: fromMock, insertMock, deleteEqMock };
}

describe('buildDailySummaryPayload', () => {
  it('returns title and body with class count and names', () => {
    const result = buildDailySummaryPayload(3, ['Yoga', 'Pilates', 'Stretching']);
    expect(result.title).toBe('Resumen del día');
    expect(result.body).toBe('Hoy tenés 3 clase(s): Yoga, Pilates, Stretching');
  });

  it('returns body with single class name', () => {
    const result = buildDailySummaryPayload(1, ['Yoga']);
    expect(result.body).toBe('Hoy tenés 1 clase(s): Yoga');
  });
});

describe('sendDailySummaries', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockBuildPushHTTPRequest.mockResolvedValue({
      endpoint: 'https://push.test',
      body: new ArrayBuffer(0),
      headers: {},
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns early when current hour is not 08:00 studio time', async () => {
    vi.setSystemTime(new Date('2026-07-06T12:00:00.000Z'));
    const supabase = createMockSupabaseClient();
    await sendDailySummaries(supabase as never, privateJWK, 'America/Argentina/Buenos_Aires');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('inserts notifications and sends pushes for students and teachers at 08:00', async () => {
    vi.setSystemTime(new Date('2026-07-06T11:00:00.000Z'));

    const enrollments = [
      { student_id: 'student-1', class_id: 'class-1', classes: { activity_name: 'Yoga', start_time: '09:00:00', teacher_id: 'teacher-1' } },
      { student_id: 'student-1', class_id: 'class-2', classes: { activity_name: 'Pilates', start_time: '10:00:00', teacher_id: 'teacher-2' } },
      { student_id: 'student-2', class_id: 'class-1', classes: { activity_name: 'Yoga', start_time: '09:00:00', teacher_id: 'teacher-1' } },
    ];

    const subscriptions = [
      { id: 'sub-1', user_id: 'student-1', endpoint: 'https://push.test/1', p256dh_key: 'p256dh-1', auth_key: 'auth-1' },
    ];

    const supabase = createMockSupabaseClient({ enrollmentsData: enrollments, subscriptionsData: subscriptions });

    await sendDailySummaries(supabase as never, privateJWK, 'America/Argentina/Buenos_Aires');

    expect(supabase.from).toHaveBeenCalledWith('enrollments');
    expect(supabase.insertMock).toHaveBeenCalledTimes(4);
    expect(supabase.insertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'student-1', type: 'daily_summary' }));
    expect(supabase.insertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'student-2', type: 'daily_summary' }));
    expect(supabase.insertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'teacher-1', type: 'daily_summary' }));
    expect(supabase.insertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'teacher-2', type: 'daily_summary' }));
  });

  it('skips push when notification insert fails (duplicate)', async () => {
    vi.setSystemTime(new Date('2026-07-06T11:00:00.000Z'));
    const enrollments = [{ student_id: 'student-1', class_id: 'class-1', classes: { activity_name: 'Yoga', start_time: '09:00:00', teacher_id: 'teacher-1' } }];
    const supabase = createMockSupabaseClient({ enrollmentsData: enrollments, insertError: new Error('unique constraint violation') });
    await sendDailySummaries(supabase as never, privateJWK, 'America/Argentina/Buenos_Aires');
    expect(supabase.insertMock).toHaveBeenCalledTimes(2);
  });
});

describe('getPreClassWindow', () => {
  it('returns today and 60-minute time boundaries', () => {
    const now = new Date('2026-07-06T09:15:00.000Z');
    const result = getPreClassWindow(now);
    expect(result.today).toBe('2026-07-06');
    expect(result.nowTime).toBe('09:15:00');
    expect(result.laterTime).toBe('10:15:00');
  });
});

describe('buildPreClassReminderPayload', () => {
  it('returns reminder with class name and start time', () => {
    const result = buildPreClassReminderPayload('Yoga', '09:00');
    expect(result.title).toBe('¡Tu clase empieza pronto!');
    expect(result.body).toBe('Yoga empieza a las 09:00');
  });
});

describe('sendPreClassReminders', () => {
  beforeEach(() => {
    mockBuildPushHTTPRequest.mockResolvedValue({ endpoint: 'https://push.test', body: new ArrayBuffer(0), headers: {} });
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 });
  });

  it('notifies student and teacher for classes in the 60-minute window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-06T09:15:00.000Z'));

    const enrollments = [
      { id: 'enrollment-1', student_id: 'student-1', class_id: 'class-1', classes: { id: 'class-1', activity_name: 'Yoga', start_time: '09:45:00', teacher_id: 'teacher-1' } },
    ];

    const subscriptions = [
      { id: 'sub-1', user_id: 'student-1', endpoint: 'https://push.test/1', p256dh_key: 'p256dh-1', auth_key: 'auth-1' },
      { id: 'sub-2', user_id: 'teacher-1', endpoint: 'https://push.test/2', p256dh_key: 'p256dh-2', auth_key: 'auth-2' },
    ];

    const supabase = createMockSupabaseClient({ enrollmentsData: enrollments, subscriptionsData: subscriptions });
    await sendPreClassReminders(supabase as never, privateJWK);

    expect(supabase.insertMock).toHaveBeenCalledTimes(2);
    expect(supabase.insertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'student-1', type: 'pre_class_reminder', reference_id: 'class-1' }));
    expect(supabase.insertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'teacher-1', type: 'pre_class_reminder', reference_id: 'class-1' }));
    vi.useRealTimers();
  });

  it('does not notify teacher when teacher is the same as student', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-06T09:15:00.000Z'));

    const enrollments = [
      { id: 'enrollment-1', student_id: 'student-1', class_id: 'class-1', classes: { id: 'class-1', activity_name: 'Yoga', start_time: '09:45:00', teacher_id: 'student-1' } },
    ];

    const supabase = createMockSupabaseClient({ enrollmentsData: enrollments });
    await sendPreClassReminders(supabase as never, privateJWK);

    expect(supabase.insertMock).toHaveBeenCalledTimes(1);
    expect(supabase.insertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'student-1' }));
    vi.useRealTimers();
  });
});

describe('getPlanExpirationMilestoneDates', () => {
  it('returns dates 1, 3, and 7 days after the given date', () => {
    const today = new Date('2026-07-06T00:00:00.000Z');
    const result = getPlanExpirationMilestoneDates(today);
    expect(result).toContain('2026-07-07');
    expect(result).toContain('2026-07-09');
    expect(result).toContain('2026-07-13');
    expect(result).toHaveLength(3);
  });
});

describe('buildPlanExpirationPayload', () => {
  it('returns expiration alert with day count', () => {
    const result = buildPlanExpirationPayload(3);
    expect(result.title).toBe('Tu plan está por vencer');
    expect(result.body).toBe('Tu plan vence en 3 día(s). Renová para seguir disfrutando.');
  });
});

describe('sendPlanExpirationAlerts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockBuildPushHTTPRequest.mockResolvedValue({ endpoint: 'https://push.test', body: new ArrayBuffer(0), headers: {} });
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('inserts plan expiration notifications for profiles on milestone days', async () => {
    vi.setSystemTime(new Date('2026-07-06T00:00:00.000Z'));
    const profiles = [{ id: 'student-1', full_name: 'Ada Lovelace' }];
    const supabase = createMockSupabaseClient({ profilesData: profiles });
    await sendPlanExpirationAlerts(supabase as never, privateJWK);

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(supabase.insertMock).toHaveBeenCalledTimes(3);
    expect(supabase.insertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'student-1', type: 'plan_expiration' }));
  });

  it('skips milestones when no matching profiles are found', async () => {
    vi.setSystemTime(new Date('2026-07-06T00:00:00.000Z'));
    const supabase = createMockSupabaseClient({ profilesData: [] });
    await sendPlanExpirationAlerts(supabase as never, privateJWK);

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(supabase.insertMock).not.toHaveBeenCalled();
  });
});

describe('sendPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildPushHTTPRequest.mockResolvedValue({ endpoint: 'https://push.test', body: new ArrayBuffer(0), headers: {} });
  });

  it('deletes subscription when push endpoint returns 410', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 410 });

    const subscriptions = [
      { id: 'sub-1', user_id: 'student-1', endpoint: 'https://push.test/expired', p256dh_key: 'p256dh-1', auth_key: 'auth-1' },
    ];

    const supabase = createMockSupabaseClient({ subscriptionsData: subscriptions });
    await sendPush(supabase as never, 'student-1', { title: 'Hi', body: 'Hello' }, privateJWK);

    expect(supabase.deleteEqMock).toHaveBeenCalledWith('id', 'sub-1');
  });

  it('deletes subscription when push endpoint returns 404', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 404 });

    const subscriptions = [
      { id: 'sub-2', user_id: 'student-1', endpoint: 'https://push.test/missing', p256dh_key: 'p256dh-2', auth_key: 'auth-2' },
    ];

    const supabase = createMockSupabaseClient({ subscriptionsData: subscriptions });
    await sendPush(supabase as never, 'student-1', { title: 'Hi', body: 'Hello' }, privateJWK);

    expect(supabase.deleteEqMock).toHaveBeenCalledWith('id', 'sub-2');
  });

  it('continues to next subscription when one push throws', async () => {
    mockBuildPushHTTPRequest
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ endpoint: 'https://push.test', body: new ArrayBuffer(0), headers: {} });

    globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 });

    const subscriptions = [
      { id: 'sub-1', user_id: 'student-1', endpoint: 'https://push.test/1', p256dh_key: 'p256dh-1', auth_key: 'auth-1' },
      { id: 'sub-2', user_id: 'student-1', endpoint: 'https://push.test/2', p256dh_key: 'p256dh-2', auth_key: 'auth-2' },
    ];

    const supabase = createMockSupabaseClient({ subscriptionsData: subscriptions });
    await sendPush(supabase as never, 'student-1', { title: 'Hi', body: 'Hello' }, privateJWK);

    expect(mockBuildPushHTTPRequest).toHaveBeenCalledTimes(2);
    expect(supabase.deleteEqMock).not.toHaveBeenCalled();
  });
});
