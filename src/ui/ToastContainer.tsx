import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useNotificationStore } from '@/core/store/useNotificationStore';
import type { NotificationEntity } from '@/core/types/notifications.types';
import './ToastContainer.css';

interface Toast {
  id: string;
  title: string;
  body: string;
}

const TOAST_DURATION_MS = 5000;
const EXIT_ANIMATION_MS = 300;

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), TOAST_DURATION_MS - EXIT_ANIMATION_MS);
    const removeTimer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION_MS);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onDismiss]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), EXIT_ANIMATION_MS);
  };

  return (
    <div
      className={`toast ${isExiting ? 'toast--exiting' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className="toast__header">
        <span className="toast__title">{toast.title}</span>
        <button
          type="button"
          className="toast__close"
          onClick={handleClose}
          aria-label="Cerrar notificación"
        >
          <X size={14} />
        </button>
      </div>
      <p className="toast__body">{toast.body}</p>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    const knownIds = new Set<string>(
      useNotificationStore.getState().notifications.map((notification) => notification.id)
    );

    return useNotificationStore.subscribe((state) => {
      if (document.visibilityState !== 'visible') {
        state.notifications.forEach((notification) => knownIds.add(notification.id));
        return;
      }

      state.notifications.forEach((notification) => {
        if (!knownIds.has(notification.id)) {
          knownIds.add(notification.id);

          const newToast: Toast = {
            id: `${notification.id}-${Date.now()}`,
            title: notification.title,
            body: notification.body,
          };

          setToasts((prev) => [...prev, newToast]);
        }
      });
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}
