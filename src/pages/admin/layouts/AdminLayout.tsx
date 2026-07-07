import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useNotificationStore } from '@/core/store/useNotificationStore';
import { authService } from '@/core/services';
import { ProfileSwitcher } from '@/ui/ProfileSwitcher';
import { NotificationBell } from '@/ui/NotificationBell';
import { NotificationPanel } from '@/ui/NotificationPanel';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Wallet,
  LogOut,
  Tag,
  BookOpen,
  ClipboardCheck,
  CalendarDays,
  User,
  LayoutGrid,
  Bell
} from 'lucide-react';
import { OverflowMenu } from './OverflowMenu';
import '../styles/admin.css';

export function AdminLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
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

  const overflowRoutes = ['/admin/students', '/admin/plans', '/admin/teachers', '/admin/enrollments', '/admin/finances', '/admin/profile'];
  const isOverflowActive = overflowRoutes.some((route) =>
    location.pathname.startsWith(route),
  );

  const handleLogout = async () => {
    await authService.logout();
    logout();
    navigate('/login');
  };

  const handleOverflowNavigate = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <div className="admin-layout">
      {/* Sidebar para Desktop / Bottom Bar para Mobile */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header__logo">
            <img src="/versatile-logo.png" alt="Logo" className="sidebar-logo" />
          </div>
          <div className="notification-area">
            <NotificationBell onClick={() => setPanelOpen(true)} />
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Notification bell — mobile only (desktop version in sidebar-header) */}
          <button
            onClick={() => setPanelOpen(true)}
            className="nav-item hide-on-desktop"
          >
            <Bell size={20} />
            <span>Notif.</span>
          </button>
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/admin/calendar"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <CalendarDays size={20} />
            <span>Grilla</span>
          </NavLink>
          <NavLink
            to="/admin/classes"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Calendar size={20} />
            <span>Clases</span>
          </NavLink>
          <NavLink
            to="/admin/finances"
            className={({ isActive }) => `nav-item hide-on-mobile ${isActive ? 'active' : ''}`}
          >
            <Wallet size={20} />
            <span>Finanzas</span>
          </NavLink>
          <NavLink
            to="/admin/profile"
            className={({ isActive }) => `nav-item hide-on-mobile ${isActive ? 'active' : ''}`}
          >
            <User size={20} />
            <span>Perfil</span>
          </NavLink>

          {/* Ocultos en mobile */}
          <NavLink
            to="/admin/students"
            className={({ isActive }) => `nav-item hide-on-mobile ${isActive ? 'active' : ''}`}
          >
            <Users size={20} />
            <span>Alumnos</span>
          </NavLink>
          <NavLink
            to="/admin/plans"
            className={({ isActive }) => `nav-item hide-on-mobile ${isActive ? 'active' : ''}`}
          >
            <Tag size={20} />
            <span>Planes</span>
          </NavLink>
          <NavLink
            to="/admin/teachers"
            className={({ isActive }) => `nav-item hide-on-mobile ${isActive ? 'active' : ''}`}
          >
            <BookOpen size={20} />
            <span>Profesores</span>
          </NavLink>
          <NavLink
            to="/admin/enrollments"
            className={({ isActive }) => `nav-item hide-on-mobile ${isActive ? 'active' : ''}`}
          >
            <ClipboardCheck size={20} />
            <span>Matrículas</span>
          </NavLink>

          {/* Más — solo visible en mobile bottom bar */}
          <button
            onClick={() => setMenuOpen(true)}
            className={`nav-item hide-on-desktop${isOverflowActive ? ' active' : ''}`}
          >
            <LayoutGrid size={20} />
            <span>Más</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <ProfileSwitcher />
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
            <span>Salir</span>
          </button>
        </div>

        <NotificationPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
      </aside>

      {/* Contenido principal inyectado por el Router */}
      <main className="admin-content">
        <Outlet />
      </main>

      {/* Overflow menu (mobile bottom sheet) */}
      <OverflowMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleOverflowNavigate}
        currentPath={location.pathname}
      />
    </div>
  );
}
