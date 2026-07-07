import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useNotificationStore } from '@/core/store/useNotificationStore';
import { authService } from '@/core/services';
import { ProfileSwitcher } from '@/ui/ProfileSwitcher';
import { NotificationBell } from '@/ui/NotificationBell';
import { NotificationPanel } from '@/ui/NotificationPanel';
import { LayoutDashboard, Calendar, CalendarDays, User, LogOut } from 'lucide-react';
import '@/pages/admin/styles/admin.css';

export function TeacherLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.id) return;

    const { fetchNotifications, setupRealtime, teardownRealtime } = useNotificationStore.getState();
    fetchNotifications(user.id);
    setupRealtime(user.id);

    return () => {
      teardownRealtime();
    };
  }, [user?.id]);

  const handleLogout = async () => {
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
          <NavLink
            to="/teacher/dashboard"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/teacher/calendar"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <CalendarDays size={20} />
            <span>Grilla</span>
          </NavLink>
          <NavLink
            to="/teacher/classes"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Calendar size={20} />
            <span>Mis Clases</span>
          </NavLink>
          <NavLink
            to="/teacher/profile"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <User size={20} />
            <span>Mi Perfil</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="notification-area">
            <NotificationBell onClick={() => setPanelOpen(true)} />
            <NotificationPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
          </div>
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
    </div>
  );
}
