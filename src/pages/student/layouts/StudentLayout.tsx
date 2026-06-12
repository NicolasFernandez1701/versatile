import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/store/useAuthStore';
import { authService } from '@/core/services';
import { LayoutDashboard, CalendarDays, User, LogOut } from 'lucide-react';
import '@/pages/admin/styles/admin.css';

export function StudentLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro de que deseas salir?')) {
      await authService.logout();
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <img src="/versatile-logo.png" alt="Logo" className="sidebar-logo" />
        </div>
        
        <nav className="sidebar-nav">
          <NavLink 
            to="/student/dashboard" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink 
            to="/student/classes" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <CalendarDays size={20} />
            <span>Mis Clases</span>
          </NavLink>

          <NavLink 
            to="/student/profile" 
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

      {/* Main Content Area */}
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
