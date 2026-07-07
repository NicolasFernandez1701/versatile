import { supabase } from './supabase';
import type { PushSubscriptionEntity } from '../types/notifications.types';

interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

function validateSubscription(subscription: PushSubscriptionInput): void {
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error('Invalid push subscription');
  }
}

export const pushService = {
  async saveSubscription(userId: string, subscription: PushSubscriptionInput): Promise<void> {
    validateSubscription(subscription);

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
      },
      { onConflict: 'endpoint' }
    );

    if (error) throw error;
  },

  async deleteSubscription(endpoint: string): Promise<void> {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);

    if (error) throw error;
  },

  async getSubscriptions(userId: string): Promise<PushSubscriptionEntity[]> {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data as PushSubscriptionEntity[];
  },

  async removeUserSubscriptions(userId: string): Promise<void> {
    const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', userId);

    if (error) throw error;
  }
};
