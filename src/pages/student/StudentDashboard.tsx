import { useNavigate } from 'react-router-dom';
import { authService } from '@/core/services';
import { useAuthStore } from '@/core/store/useAuthStore';
import { LogOut } from 'lucide-react';

export function StudentDashboard() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Dashboard de Alumno</h1>
      <p style={{ marginBottom: '2rem' }}>Próximamente estaremos trabajando en esta vista.</p>
      
      <button 
        className="btn-secondary" 
        onClick={handleLogout}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
      >
        <LogOut size={20} />
        Cerrar Sesión
      </button>
    </div>
  );
}
