import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { NotificationEntity } from '../types/notifications.types';
import { notificationsService } from '../services/notifications.service';
import { supabase } from '../services/supabase';

export interface NotificationStore {
  notifications: NotificationEntity[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  realtimeChannel: RealtimeChannel | null;
  fetchNotifications: (userId: string) => Promise<void>;
  addNotification: (notification: NotificationEntity) => void;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  setupRealtime: (userId: string) => void;
  teardownRealtime: () => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  realtimeChannel: null,

  fetchNotifications: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const [notifications, unreadCount] = await Promise.all([
        notificationsService.getNotifications(userId),
        notificationsService.getUnreadCount(userId),
      ]);
      set({ notifications, unreadCount, isLoading: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : 'Error desconocido',
        isLoading: false,
      });
    }
  },

  addNotification: (notification: NotificationEntity) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: async (ids: string[]) => {
    if (ids.length === 0) return;

    await notificationsService.markAsRead(ids);

    set((state) => ({
      notifications: state.notifications.map((notification) =>
        ids.includes(notification.id) && notification.read_at === null
          ? { ...notification, read_at: new Date().toISOString() }
          : notification
      ),
      unreadCount: Math.max(
        0,
        state.unreadCount -
          ids.filter((id) =>
            state.notifications.find((n) => n.id === id && n.read_at === null)
          ).length
      ),
    }));
  },

  markAllAsRead: async (userId: string) => {
    await notificationsService.markAllAsRead(userId);

    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read_at: notification.read_at ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    }));
  },

  setupRealtime: (userId: string) => {
    get().teardownRealtime();

    const channel = supabase.channel(`notifications:${userId}`).on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload: { new: NotificationEntity }) => {
        get().addNotification(payload.new);
      }
    );

    channel.subscribe();
    set({ realtimeChannel: channel });
  },

  teardownRealtime: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
      set({ realtimeChannel: null });
    }
  },

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      realtimeChannel: null,
    }),
}));
