import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNotificationStore } from './useNotificationStore';
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
    body: 'Ballet a las 10:00',
    reference_id: 'cls-001',
    sent_at: '2024-06-15T09:00:00.000Z',
    read_at: null,
  },
];

const newNotification: NotificationEntity = {
  id: 'ntf-003',
  user_id: USER_ID,
  type: 'plan_expiration',
  title: 'Plan por vencer',
  body: 'Tu plan vence en 3 días',
  reference_id: 'plan-001',
  sent_at: '2024-06-15T10:00:00.000Z',
  read_at: null,
};

const {
  mockGetNotifications,
  mockGetUnreadCount,
  mockMarkAsRead,
  mockMarkAllAsRead,
} = vi.hoisted(() => ({
  mockGetNotifications: vi.fn(),
  mockGetUnreadCount: vi.fn(),
  mockMarkAsRead: vi.fn(),
  mockMarkAllAsRead: vi.fn(),
}));

vi.mock('../services/notifications.service', () => ({
  notificationsService: {
    getNotifications: mockGetNotifications,
    getUnreadCount: mockGetUnreadCount,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
  },
}));

const mockChannelOn = vi.fn();
const mockChannelSubscribe = vi.fn();
const mockChannelUnsubscribe = vi.fn();
const mockChannel = {
  on: mockChannelOn,
  subscribe: mockChannelSubscribe,
  unsubscribe: mockChannelUnsubscribe,
};

const { mockChannel: mockChannelFactory } = vi.hoisted(() => ({
  mockChannel: vi.fn(() => mockChannel),
}));

vi.mock('../services/supabase', () => ({
  supabase: {
    channel: mockChannelFactory,
  },
}));

describe('useNotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      realtimeChannel: null,
    });
    vi.clearAllMocks();
    mockChannelOn.mockReturnValue(mockChannel);
  });

  // ────────────────────────────────────────────
  // Initial state
  // ────────────────────────────────────────────
  it('debería arrancar con estado inicial vacío', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  // ────────────────────────────────────────────
  // fetchNotifications
  // ────────────────────────────────────────────
  describe('fetchNotifications', () => {
    it('debería cargar notificaciones y unread count', async () => {
      mockGetNotifications.mockResolvedValue(mockNotifications);
      mockGetUnreadCount.mockResolvedValue(2);

      await useNotificationStore.getState().fetchNotifications(USER_ID);

      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual(mockNotifications);
      expect(state.unreadCount).toBe(2);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockGetNotifications).toHaveBeenCalledWith(USER_ID);
      expect(mockGetUnreadCount).toHaveBeenCalledWith(USER_ID);
    });

    it('debería manejar errores', async () => {
      mockGetNotifications.mockRejectedValue(new Error('Error al cargar'));

      await useNotificationStore.getState().fetchNotifications(USER_ID);

      const state = useNotificationStore.getState();
      expect(state.error).toBe('Error al cargar');
      expect(state.isLoading).toBe(false);
      expect(state.notifications).toEqual([]);
    });

    it('debería mostrar loading mientras se ejecuta', async () => {
      let resolvePromise: (value: NotificationEntity[]) => void;
      mockGetNotifications.mockReturnValue(new Promise((r) => (resolvePromise = r)));
      mockGetUnreadCount.mockResolvedValue(0);

      const promise = useNotificationStore.getState().fetchNotifications(USER_ID);

      expect(useNotificationStore.getState().isLoading).toBe(true);

      resolvePromise!(mockNotifications);
      await promise;

      expect(useNotificationStore.getState().isLoading).toBe(false);
    });
  });

  // ────────────────────────────────────────────
  // addNotification
  // ────────────────────────────────────────────
  describe('addNotification', () => {
    it('debería agregar una notificación al inicio e incrementar unreadCount', () => {
      useNotificationStore.setState({ notifications: mockNotifications, unreadCount: 2 });

      useNotificationStore.getState().addNotification(newNotification);

      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual([newNotification, ...mockNotifications]);
      expect(state.unreadCount).toBe(3);
    });
  });

  // ────────────────────────────────────────────
  // markAsRead
  // ────────────────────────────────────────────
  describe('markAsRead', () => {
    it('debería marcar como leídas las notificaciones seleccionadas', async () => {
      mockMarkAsRead.mockResolvedValue(undefined);
      useNotificationStore.setState({ notifications: mockNotifications, unreadCount: 2 });

      await useNotificationStore.getState().markAsRead(['ntf-001']);

      expect(mockMarkAsRead).toHaveBeenCalledWith(['ntf-001']);
      const state = useNotificationStore.getState();
      expect(state.notifications[0].read_at).not.toBeNull();
      expect(state.unreadCount).toBe(1);
    });

    it('debería lanzar error si el servicio falla', async () => {
      mockMarkAsRead.mockRejectedValue(new Error('Error al marcar'));
      useNotificationStore.setState({ notifications: mockNotifications, unreadCount: 2 });

      await expect(useNotificationStore.getState().markAsRead(['ntf-001'])).rejects.toThrow('Error al marcar');
    });
  });

  // ────────────────────────────────────────────
  // markAllAsRead
  // ────────────────────────────────────────────
  describe('markAllAsRead', () => {
    it('debería marcar todas las notificaciones como leídas y resetear unreadCount', async () => {
      mockMarkAllAsRead.mockResolvedValue(undefined);
      useNotificationStore.setState({ notifications: mockNotifications, unreadCount: 2 });

      await useNotificationStore.getState().markAllAsRead(USER_ID);

      expect(mockMarkAllAsRead).toHaveBeenCalledWith(USER_ID);
      const state = useNotificationStore.getState();
      expect(state.notifications.every((n) => n.read_at !== null)).toBe(true);
      expect(state.unreadCount).toBe(0);
    });

    it('debería lanzar error si el servicio falla', async () => {
      mockMarkAllAsRead.mockRejectedValue(new Error('Error al marcar todo'));

      await expect(useNotificationStore.getState().markAllAsRead(USER_ID)).rejects.toThrow('Error al marcar todo');
    });
  });

  // ────────────────────────────────────────────
  // setupRealtime / teardownRealtime
  // ────────────────────────────────────────────
  describe('setupRealtime', () => {
    it('debería suscribirse al canal de notificaciones del usuario', () => {
      mockChannelSubscribe.mockReturnValue('SUBSCRIBED');

      useNotificationStore.getState().setupRealtime(USER_ID);

      expect(mockChannelFactory).toHaveBeenCalledWith(`notifications:${USER_ID}`);
      expect(mockChannelOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${USER_ID}`,
        },
        expect.any(Function),
      );
      expect(mockChannelSubscribe).toHaveBeenCalled();
    });

    it('debería agregar la notificación recibida por realtime', () => {
      let realtimeCallback: (payload: { new: NotificationEntity }) => void = () => {};
      mockChannelOn.mockImplementation((_event, _config, callback) => {
        realtimeCallback = callback;
        return mockChannel;
      });
      mockChannelSubscribe.mockReturnValue('SUBSCRIBED');

      useNotificationStore.getState().setupRealtime(USER_ID);
      realtimeCallback({ new: newNotification });

      const state = useNotificationStore.getState();
      expect(state.notifications).toContainEqual(newNotification);
      expect(state.unreadCount).toBe(1);
    });

    it('debería desuscribirse del canal existente antes de crear uno nuevo', () => {
      mockChannelSubscribe.mockReturnValue('SUBSCRIBED');

      useNotificationStore.getState().setupRealtime(USER_ID);
      useNotificationStore.getState().setupRealtime('user-002');

      expect(mockChannelUnsubscribe).toHaveBeenCalledTimes(1);
      expect(mockChannelFactory).toHaveBeenCalledTimes(2);
    });
  });

  describe('teardownRealtime', () => {
    it('debería desuscribirse del canal y limpiar la referencia', () => {
      mockChannelSubscribe.mockReturnValue('SUBSCRIBED');
      useNotificationStore.getState().setupRealtime(USER_ID);

      useNotificationStore.getState().teardownRealtime();

      expect(mockChannelUnsubscribe).toHaveBeenCalledTimes(1);
      expect(useNotificationStore.getState().realtimeChannel).toBeNull();
    });

    it('no debería fallar si no hay canal activo', () => {
      expect(() => useNotificationStore.getState().teardownRealtime()).not.toThrow();
    });
  });
});
