import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationsService } from './notifications.service';
import type { NotificationEntity } from '../types/notifications.types';

const USER_ID = 'user-001';

const mockNotifications: NotificationEntity[] = [
  {
    id: 'ntf-001',
    user_id: USER_ID,
    type: 'daily_summary',
    title: 'Resumen diario',
    body: 'Tenés 3 clases hoy',
    reference_id: null,
    sent_at: '2024-06-15T08:00:00.000Z',
    read_at: null,
  },
  {
    id: 'ntf-002',
    user_id: USER_ID,
    type: 'pre_class_reminder',
    title: 'Recordatorio',
    body: 'Ballet Clásico a las 10:00',
    reference_id: 'cls-001',
    sent_at: '2024-06-15T09:00:00.000Z',
    read_at: null,
  },
];

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { from: mockFrom },
}));

describe('notificationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────
  // getNotifications
  // ────────────────────────────────────────────
  describe('getNotifications', () => {
    it('debería devolver las notificaciones del usuario ordenadas por sent_at DESC con límite 50', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: mockNotifications, error: null }),
            })),
          })),
        })),
      });

      const result = await notificationsService.getNotifications(USER_ID);

      expect(result).toEqual(mockNotifications);
      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });

    it('debería lanzar error si Supabase falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: null, error: new Error('Error DB') }),
            })),
          })),
        })),
      });

      await expect(notificationsService.getNotifications(USER_ID)).rejects.toThrow('Error DB');
    });
  });

  // ────────────────────────────────────────────
  // getUnreadCount
  // ────────────────────────────────────────────
  describe('getUnreadCount', () => {
    it('debería devolver la cantidad de notificaciones no leídas', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn().mockResolvedValue({ count: 5, error: null }),
          })),
        })),
      });

      const result = await notificationsService.getUnreadCount(USER_ID);

      expect(result).toBe(5);
      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });

    it('debería devolver 0 cuando count es null', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn().mockResolvedValue({ count: null, error: null }),
          })),
        })),
      });

      const result = await notificationsService.getUnreadCount(USER_ID);

      expect(result).toBe(0);
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn().mockResolvedValue({ count: null, error: new Error('Error count') }),
          })),
        })),
      });

      await expect(notificationsService.getUnreadCount(USER_ID)).rejects.toThrow('Error count');
    });
  });

  // ────────────────────────────────────────────
  // markAsRead
  // ────────────────────────────────────────────
  describe('markAsRead', () => {
    it('debería actualizar read_at de los ids recibidos', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          in: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await notificationsService.markAsRead(['ntf-001', 'ntf-002']);

      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });

    it('debería lanzar error si el update falla', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          in: vi.fn().mockResolvedValue({ error: new Error('Error update') }),
        })),
      });

      await expect(notificationsService.markAsRead(['ntf-001'])).rejects.toThrow('Error update');
    });
  });

  // ────────────────────────────────────────────
  // markAllAsRead
  // ────────────────────────────────────────────
  describe('markAllAsRead', () => {
    it('debería actualizar read_at de todas las notificaciones no leídas del usuario', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      });

      await notificationsService.markAllAsRead(USER_ID);

      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });

    it('debería lanzar error si el update falla', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn().mockResolvedValue({ error: new Error('Error update all') }),
          })),
        })),
      });

      await expect(notificationsService.markAllAsRead(USER_ID)).rejects.toThrow('Error update all');
    });
  });
});
