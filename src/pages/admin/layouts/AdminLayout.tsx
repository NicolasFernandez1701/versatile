import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/store/useAuthStore';
import { authService } from '@/core/services';
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
  User
} from 'lucide-react';
import '../styles/admin.css';

export function AdminLayout() {
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
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Wallet size={20} />
            <span>Finanzas</span>
          </NavLink>
          <NavLink
            to="/admin/profile"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
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
