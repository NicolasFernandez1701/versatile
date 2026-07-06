export const NOTIFICATION_TYPES = [
  'daily_summary',
  'pre_class_reminder',
  'plan_expiration',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationEntity {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  reference_id: string | null;
  sent_at: string;
  read_at: string | null;
}

export interface PushSubscriptionEntity {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  created_at: string;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export function isValidPushPayload(payload: unknown): payload is PushPayload {
  if (payload === null || typeof payload !== 'object') {
    return false;
  }

  const { title, body } = payload as Record<string, unknown>;

  return typeof title === 'string' && typeof body === 'string';
}
