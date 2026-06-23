import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/store/useAuthStore';
import { authService } from '@/core/services';
import { LayoutDashboard, Calendar, CalendarDays, User, LogOut } from 'lucide-react';
import '@/pages/admin/styles/admin.css';

export function TeacherLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {/* Sidebar para Desktop / Bottom Bar para Mobile */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <img src="/versatile-logo.png" alt="Logo" className="sidebar-logo" />
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
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal inyectado por el Router */}
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
