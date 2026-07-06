import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/core/store/useAuthStore';
import { authService } from '@/core/services';
import { Eye, EyeOff } from 'lucide-react';
import { useLoginForm } from '@/core/hooks/onboarding/useLoginForm';
import './auth.css';

import { Button } from '@/ui';

export function LoginPage() {
  const { isAuthenticated, role, isLoading } = useAuthStore();
  const {
    email,
    password,
    loading,
    error,
    setEmail,
    setPassword,
    handleSubmit,
  } = useLoginForm();

  const [showPassword, setShowPassword] = useState(false);

  if (isLoading) return null;

  if (isAuthenticated) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
    if (role === 'student') return <Navigate to="/student/dashboard" replace />;

    return (
      <div
        className="auth-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          textAlign: 'center',
          padding: '2rem'
        }}
      >
        <h2 style={{ color: 'var(--error-color)' }}>Cuenta sin configurar</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Tu usuario no tiene un rol asignado en la base de datos (Posiblemente fue creado a mano
          sin disparar el trigger de perfil).
        </p>
        <Button
          onClick={async () => {
            await authService.logout();
            useAuthStore.getState().logout();
          }}
        >
          Cerrar Sesión y Volver
        </Button>
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <div className="auth-container">
      <div className="auth-scroll-content">
        <div className="auth-logo-container">
          <img src="/versatile-logo.png" alt="Versatile Logo" className="auth-logo-image" />
        </div>

        <div className="auth-form-container">
          <h2 className="auth-form-title">Bienvenido de nuevo</h2>
          <p className="auth-form-subtitle">Ingresá tus credenciales para continuar</p>

          <form onSubmit={onSubmit} className="auth-form">
            {error && <div className="auth-error-message">{error}</div>}

            <div className="auth-input-group">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
            </div>

            <div className="auth-input-group auth-password-group">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} className="text-secondary" />
                ) : (
                  <Eye size={20} className="text-secondary" />
                )}
              </button>
            </div>

            <Button type="submit" loading={loading} className="auth-submit-btn">
              Iniciar Sesión
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
