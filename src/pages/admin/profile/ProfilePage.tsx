import { useAuthStore } from '@/core/store/useAuthStore';
import { authService } from '@/core/services';
import { useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon, Monitor, Shield, Mail } from 'lucide-react';
import './profile.css';
import { useThemeStore } from '@/core/store/useThemeStore';

export function ProfilePage() {
  const { user, logout } = useAuthStore();
  const { theme: themeMode, setTheme } = useThemeStore();
  const navigate = useNavigate(); 

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro de que deseas salir de Versatile Studio?')) {
      await authService.logout();
      logout();
      navigate('/login');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'VS';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleName = (role: string) => {
    if (role === 'admin') return 'Administrador';
    if (role === 'teacher') return 'Profesor';
    return 'Alumno';
  };

  return (
    <div className="page-container profile-container">
      <div className="profile-header">
        <div className="avatar-circle">
          <span className="avatar-text">{getInitials(user?.profile?.full_name || user?.user_metadata?.full_name || '')}</span>
        </div>
        <h2 className="user-name">{user?.profile?.full_name || user?.user_metadata?.full_name || 'Usuario Versatile'}</h2>
        <div className="role-badge">
          <Shield size={14} />
          <span>{getRoleName(user?.profile?.role || user?.user_metadata?.role || 'student')}</span>
        </div>
      </div>

      <div className="profile-sections">
        <div className="profile-group">
          <h3 className="section-title">Información de la Cuenta</h3>
          <div className="profile-card">
            <div className="list-item">
              <Mail className="list-icon" size={24} />
              <div className="list-content">
                <span className="list-title">Correo Electrónico</span>
                <span className="list-desc">{user?.email || 'No disponible'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-group">
          <h3 className="section-title">Apariencia y Tema</h3>
          <div className="profile-card theme-card">
            <p className="theme-subtitle">Selecciona el tema de la interfaz:</p>
            <div className="theme-options">
              <button 
                className={`theme-btn ${themeMode === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun size={18} />
                <span>Claro</span>
              </button>
              <button 
                className={`theme-btn ${themeMode === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon size={18} />
                <span>Oscuro</span>
              </button>
              <button 
                className={`theme-btn ${themeMode === 'system' ? 'active' : ''}`}
                onClick={() => setTheme('system')}
              >
                <Monitor size={18} />
                <span>Sistema</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <button className="btn-primary logout-btn-full hide-on-desktop" onClick={handleLogout}>
        <LogOut size={20} />
        <span>Cerrar Sesión</span>
      </button>
    </div>
  );
}
