import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pushService } from './push.service';
import type { PushSubscriptionEntity } from '../types/notifications.types';

const USER_ID = 'user-001';

const mockSubscription: PushSubscriptionEntity = {
  id: 'sub-001',
  user_id: USER_ID,
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  p256dh_key: 'p256dh-key',
  auth_key: 'auth-key',
  created_at: '2024-06-15T08:00:00.000Z',
};

const subscriptionPayload = {
  endpoint: mockSubscription.endpoint,
  keys: {
    p256dh: mockSubscription.p256dh_key,
    auth: mockSubscription.auth_key,
  },
};

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { from: mockFrom },
}));

describe('pushService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────
  // saveSubscription
  // ────────────────────────────────────────────
  describe('saveSubscription', () => {
    it('debería guardar una suscripción push con upsert por endpoint', async () => {
      mockFrom.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });

      await pushService.saveSubscription(USER_ID, subscriptionPayload);

      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions');
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar error si falta endpoint', async () => {
      await expect(
        pushService.saveSubscription(USER_ID, {
          endpoint: '',
          keys: { p256dh: 'key', auth: 'auth' },
        }),
      ).rejects.toThrow('Invalid push subscription');

      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('debería lanzar error si falta p256dh', async () => {
      await expect(
        pushService.saveSubscription(USER_ID, {
          endpoint: 'https://example.com',
          keys: { p256dh: '', auth: 'auth' },
        }),
      ).rejects.toThrow('Invalid push subscription');
    });

    it('debería lanzar error si falta auth', async () => {
      await expect(
        pushService.saveSubscription(USER_ID, {
          endpoint: 'https://example.com',
          keys: { p256dh: 'key', auth: '' },
        }),
      ).rejects.toThrow('Invalid push subscription');
    });

    it('debería lanzar error si Supabase falla', async () => {
      mockFrom.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: new Error('Error upsert') }),
      });

      await expect(pushService.saveSubscription(USER_ID, subscriptionPayload)).rejects.toThrow('Error upsert');
    });
  });

  // ────────────────────────────────────────────
  // deleteSubscription
  // ────────────────────────────────────────────
  describe('deleteSubscription', () => {
    it('debería eliminar una suscripción por endpoint', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await pushService.deleteSubscription(mockSubscription.endpoint);

      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions');
    });

    it('debería lanzar error si la eliminación falla', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error delete') }),
        })),
      });

      await expect(pushService.deleteSubscription(mockSubscription.endpoint)).rejects.toThrow('Error delete');
    });
  });

  // ────────────────────────────────────────────
  // getSubscriptions
  // ────────────────────────────────────────────
  describe('getSubscriptions', () => {
    it('debería devolver las suscripciones del usuario', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [mockSubscription], error: null }),
        })),
      });

      const result = await pushService.getSubscriptions(USER_ID);

      expect(result).toEqual([mockSubscription]);
      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions');
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Error select') }),
        })),
      });

      await expect(pushService.getSubscriptions(USER_ID)).rejects.toThrow('Error select');
    });
  });

  // ────────────────────────────────────────────
  // removeUserSubscriptions
  // ────────────────────────────────────────────
  describe('removeUserSubscriptions', () => {
    it('debería eliminar todas las suscripciones de un usuario', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await pushService.removeUserSubscriptions(USER_ID);

      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions');
    });

    it('debería lanzar error si la eliminación falla', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error delete all') }),
        })),
      });

      await expect(pushService.removeUserSubscriptions(USER_ID)).rejects.toThrow('Error delete all');
    });
  });
});
