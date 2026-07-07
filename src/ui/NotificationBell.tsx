import { Bell } from 'lucide-react';
import { useNotificationStore } from '@/core/store/useNotificationStore';
import './NotificationBell.css';

interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const displayCount = unreadCount > 9 ? '9+' : unreadCount;
  const showBadge = unreadCount > 0;

  return (
    <div className="notification-bell">
      <button
        type="button"
        className="notification-bell__button"
        onClick={onClick}
        aria-label="Notificaciones"
      >
        <Bell size={22} />
      </button>
      {showBadge && (
        <span className="notification-bell__badge" aria-label={`${unreadCount} notificaciones sin leer`}>
          {displayCount}
        </span>
      )}
    </div>
  );
}
