import { useEffect, useRef } from 'react';
import { pushService } from '../../services/push.service';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(userId: string | undefined) {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!userId || subscribedRef.current) return;
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[Push] VITE_VAPID_PUBLIC_KEY not configured');
      return;
    }

    const subscribe = async () => {
      // 1. Check browser support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
      }

      // 2. Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // 3. Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        subscribedRef.current = true;
        return;
      }

      // 4. Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return;
      }

      // 5. Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 6. Extract keys and save to Supabase
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');

      if (!p256dhKey || !authKey) {
        console.error('[Push] Failed to get subscription keys');
        return;
      }

      await pushService.saveSubscription(userId, {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dhKey))),
          auth: btoa(String.fromCharCode(...new Uint8Array(authKey))),
        },
      });

      subscribedRef.current = true;
    };

    subscribe().catch((err) => {
      console.error('[Push] Subscription failed:', err);
    });
  }, [userId]);
}
