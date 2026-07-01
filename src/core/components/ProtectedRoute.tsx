import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Loader } from '@/components/ui';

interface ProtectedRouteProps {
  allowedRoles?: ('admin' | 'teacher' | 'student')[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  // `activeRole` is the currently selected membership role from the auth store.
  // `role` remains as a backward-compatible alias of `activeRole`.
  const { isAuthenticated, activeRole, isLoading, user } = useAuthStore();

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
  if (activeRole === 'student' && hasCompletedOnboarding === false) {
    if (!isStudentOnboarding) return <Navigate to="/onboarding" replace />;
  } else if (isStudentOnboarding && hasCompletedOnboarding !== false) {
    if (activeRole === 'admin') return <Navigate to="/admin" replace />;
    if (activeRole === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
    if (activeRole === 'student') return <Navigate to="/student/dashboard" replace />;
  }

  // Si es un profesor y no completó el onboarding, enviarlo a /teacher-onboarding
  const isTeacherOnboarding = window.location.pathname === '/teacher-onboarding';
  if (activeRole === 'teacher' && hasCompletedOnboarding === false) {
    if (!isTeacherOnboarding) return <Navigate to="/teacher-onboarding" replace />;
  } else if (isTeacherOnboarding && hasCompletedOnboarding !== false) {
    if (activeRole === 'admin') return <Navigate to="/admin" replace />;
    if (activeRole === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
    if (activeRole === 'student') return <Navigate to="/student/dashboard" replace />;
  }

  // Si la ruta pide un rol específico y el usuario no lo tiene, patada al dashboard correspondiente
  if (allowedRoles) {
    if (!activeRole || !allowedRoles.includes(activeRole)) {
      // Si un alumno quiere entrar al admin, lo mandamos a su panel
      if (activeRole === 'student') return <Navigate to="/student/dashboard" replace />;
      if (activeRole === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
      return <Navigate to="/login" replace />;
    }
  }

  // Si pasó los controles, renderiza la vista protegida
  return <Outlet />;
}
