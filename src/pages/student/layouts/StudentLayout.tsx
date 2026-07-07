import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useNotificationStore } from '@/core/store/useNotificationStore';
import { authService } from '@/core/services';
import { ProfileSwitcher } from '@/ui/ProfileSwitcher';
import { NotificationPanel } from '@/ui/NotificationPanel';
import { LayoutDashboard, CalendarDays, User, LogOut, Tag, Bell } from 'lucide-react';
import { ConfirmModal } from '@/ui';
import '@/pages/admin/styles/admin.css';

export function StudentLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTop, setPanelTop] = useState<number | undefined>(undefined);
  const desktopBellRef = useRef<HTMLButtonElement>(null);
  const user = useAuthStore((state) => state.user);
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  useEffect(() => {
    if (panelOpen && desktopBellRef.current) {
      const btnTop = desktopBellRef.current.getBoundingClientRect().top;
      const layoutTop = document.querySelector('.admin-layout')?.getBoundingClientRect().top ?? 0;
      setPanelTop(btnTop - layoutTop);
    }
  }, [panelOpen]);

  useEffect(() => {
    if (!user?.id) return;

    const { fetchNotifications, setupRealtime, teardownRealtime } = useNotificationStore.getState();
    fetchNotifications(user.id);
    setupRealtime(user.id);

    return () => {
      teardownRealtime();
    };
  }, [user?.id]);

  const handleLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = async () => {
    await authService.logout();
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header__logo">
            <img src="/versatile-logo.png" alt="Logo" className="sidebar-logo" />
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            ref={desktopBellRef}
            onClick={() => setPanelOpen(true)}
            className="nav-item hide-on-mobile"
          >
            <Bell size={20} />
            <span>Notificaciones</span>
            {unreadCount > 0 && (
              <span className="sidebar-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          <button
            onClick={() => setPanelOpen(true)}
            className="nav-item hide-on-desktop"
          >
            <div className="mobile-nav-icon-wrapper">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="mobile-nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </div>
            <span>Notif.</span>
          </button>
          <NavLink
            to="/student/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/student/catalog"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <CalendarDays size={20} />
            <span>Grilla</span>
          </NavLink>
          <NavLink
            to="/student/plans"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Tag size={20} />
            <span>Planes</span>
          </NavLink>
          <NavLink
            to="/student/classes"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <CalendarDays size={20} />
            <span>Reservas</span>
          </NavLink>
          <NavLink
            to="/student/profile"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <User size={20} />
            <span>Perfil</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <ProfileSwitcher />
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>

      <NotificationPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        style={panelTop !== undefined ? { top: `${panelTop}px` } : undefined}
      />

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas salir?"
        confirmText="Salir"
        isDestructive={true}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
