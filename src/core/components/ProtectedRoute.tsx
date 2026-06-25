import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Loader } from '@/components/ui';

interface ProtectedRouteProps {
  allowedRoles?: ('admin' | 'teacher' | 'student')[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  // `role` is derived from `studio_members.role` (via membership) in the auth store.
  // `profiles.role` is kept as a fallback during the migration period only.
  const { isAuthenticated, role, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <Loader fullScreen text="Cargando sesión..." size="large" />;
  }

  // Si no está logueado, patada al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Convertimos undefined/null a false explícitamente para evitar saltos del onboarding
  const hasCompletedOnboarding = user?.profile?.has_completed_onboarding ?? false;

  // Si es un estudiante y no completó el onboarding, enviarlo a /onboarding
  const isStudentOnboarding = window.location.pathname === '/onboarding';
  if (role === 'student' && hasCompletedOnboarding === false) {
    if (!isStudentOnboarding) return <Navigate to="/onboarding" replace />;
  } else if (isStudentOnboarding && hasCompletedOnboarding !== false) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
    if (role === 'student') return <Navigate to="/student/dashboard" replace />;
  }

  // Si es un profesor y no completó el onboarding, enviarlo a /teacher-onboarding
  const isTeacherOnboarding = window.location.pathname === '/teacher-onboarding';
  if (role === 'teacher' && hasCompletedOnboarding === false) {
    if (!isTeacherOnboarding) return <Navigate to="/teacher-onboarding" replace />;
  } else if (isTeacherOnboarding && hasCompletedOnboarding !== false) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
    if (role === 'student') return <Navigate to="/student/dashboard" replace />;
  }

  // Si la ruta pide un rol específico y el usuario no lo tiene, patada al dashboard correspondiente
  if (allowedRoles) {
    if (!role || !allowedRoles.includes(role)) {
      // Si un alumno quiere entrar al admin, lo mandamos a su panel
      if (role === 'student') return <Navigate to="/student/dashboard" replace />;
      if (role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
      return <Navigate to="/login" replace />;
    }
  }

  // Si pasó los controles, renderiza la vista protegida
  return <Outlet />;
}
