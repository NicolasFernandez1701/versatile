import { describe, it, expect } from 'vitest';
import {
  NOTIFICATION_TYPES,
  isValidPushPayload,
} from './notifications.types';

describe('notifications.types', () => {
  describe('NOTIFICATION_TYPES', () => {
    it('should include all supported notification types in order', () => {
      expect(NOTIFICATION_TYPES).toEqual([
        'daily_summary',
        'pre_class_reminder',
        'plan_expiration',
      ]);
    });

    it('should reject an unknown notification type string', () => {
      const unknown = 'unknown_type' as string;
      expect(NOTIFICATION_TYPES.includes(unknown as never)).toBe(false);
    });
  });

  describe('isValidPushPayload', () => {
    it('should return true for a payload with title and body', () => {
      expect(
        isValidPushPayload({ title: 'Hello', body: 'World' }),
      ).toBe(true);
    });

    it('should return false when title is missing', () => {
      expect(isValidPushPayload({ body: 'World' })).toBe(false);
    });

    it('should return false when body is missing', () => {
      expect(isValidPushPayload({ title: 'Hello' })).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isValidPushPayload(null)).toBe(false);
      expect(isValidPushPayload('text')).toBe(false);
      expect(isValidPushPayload(123)).toBe(false);
    });

    it('should accept optional icon and url fields', () => {
      expect(
        isValidPushPayload({
          title: 'Hello',
          body: 'World',
          icon: '/logo.png',
          url: '/notifications',
        }),
      ).toBe(true);
    });

    it('should reject non-string title or body', () => {
      expect(isValidPushPayload({ title: 123, body: 'World' })).toBe(false);
      expect(isValidPushPayload({ title: 'Hello', body: true })).toBe(false);
    });
  });
});
