import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from './Loader';
import { useNotificationStore } from '@/core/store/useNotificationStore';
import { useAuthStore } from '@/core/store/useAuthStore';
import type { NotificationEntity, NotificationType } from '@/core/types/notifications.types';
import './NotificationPanel.css';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_ICONS: Record<NotificationType, string> = {
  daily_summary: '📅',
  pre_class_reminder: '⏰',
  plan_expiration: '📆',
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Hace un momento';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} d`;

  const months = Math.floor(days / 30);
  if (months < 12) return `Hace ${months} mes`;

  const years = Math.floor(months / 12);
  return `Hace ${years} año${years > 1 ? 's' : ''}`;
}

function getNavigationPath(type: NotificationType, role: string | null): string | null {
  if (type === 'pre_class_reminder') {
    return role ? `/${role}/classes` : null;
  }

  if (type === 'plan_expiration') {
    return role === 'student' ? '/student/plans' : null;
  }

  return null;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const activeRole = useAuthStore((state) => state.activeRole);
  const { notifications, isLoading, error, markAsRead, markAllAsRead } = useNotificationStore();

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );

  const handleMarkAllAsRead = () => {
    if (user?.id) {
      markAllAsRead(user.id);
    }
  };

  const handleItemClick = (notification: NotificationEntity) => {
    markAsRead([notification.id]);

    const path = getNavigationPath(notification.type, activeRole);
    if (path) {
      navigate(path);
    }

    onClose();
  };

  return (
    <div
      className="notification-panel"
      ref={panelRef}
      role="dialog"
      aria-label="Panel de notificaciones"
    >
      <div className="notification-panel__header">
        <h3>Notificaciones</h3>
        <button
          type="button"
          className="notification-panel__mark-all"
          onClick={handleMarkAllAsRead}
        >
          Marcar todo como leído
        </button>
      </div>

      {isLoading && (
        <div className="notification-panel__loading">
          <Loader size="small" text="Cargando..." />
        </div>
      )}

      {!isLoading && error && (
        <div className="notification-panel__error">
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && sortedNotifications.length === 0 && (
        <div className="notification-panel__empty">
          <p>No tenés notificaciones</p>
        </div>
      )}

      {!isLoading && !error && sortedNotifications.length > 0 && (
        <ul className="notification-panel__list" role="list">
          {sortedNotifications.map((notification) => (
            <li
              key={notification.id}
              className={`notification-panel__item ${
                notification.read_at ? 'notification-panel__item--read' : ''
              }`}
              onClick={() => handleItemClick(notification)}
              role="listitem"
            >
              <span className="notification-panel__icon" aria-hidden="true">
                {TYPE_ICONS[notification.type]}
              </span>
              <div className="notification-panel__content">
                <p className="notification-panel__title">{notification.title}</p>
                <p className="notification-panel__body">{notification.body}</p>
                <time className="notification-panel__time" dateTime={notification.sent_at}>
                  {formatTimeAgo(notification.sent_at)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
