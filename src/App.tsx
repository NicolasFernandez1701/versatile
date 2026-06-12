import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from '@/core/services';
import { useAuthStore } from './core/store/useAuthStore';
import { useThemeStore } from './core/store/useThemeStore';
import { LoginPage } from './pages/auth/LoginPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';
import { TeacherOnboardingPage } from './pages/onboarding/TeacherOnboardingPage';
import { ProtectedRoute } from './core/components/ProtectedRoute';
import { AdminLayout } from './pages/admin/layouts/AdminLayout';
import { AdminDashboard } from './pages/admin/dashboard/AdminDashboard';
import { ClassesPage } from './pages/admin/classes/ClassesPage';
import { PlansPage } from './pages/admin/plans/PlansPage';
import { FinancesPage } from './pages/admin/finances/FinancesPage';
import { StudentsPage } from './pages/admin/students/StudentsPage';
import { TeachersPage } from './pages/admin/teachers/TeachersPage';
import { EnrollmentsPage } from './pages/admin/enrollments/EnrollmentsPage';
import { AdminCalendarPage } from './pages/admin/calendar/AdminCalendarPage';
import { ProfilePage } from './pages/admin/profile/ProfilePage';
import { StudentDashboard } from './pages/student/StudentDashboard';

export default function App() {
  const { setUser, setLoading } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let activeTheme = theme;
      if (theme === 'system') {
        activeTheme = mediaQuery.matches ? 'dark' : 'light';
      }
      root.setAttribute('data-theme', activeTheme);
      root.style.colorScheme = activeTheme; // Keeps native inputs styled correctly
    };

    applyTheme();
    
    // Listen for system changes if 'system' is selected
    if (theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  useEffect(() => {
    // Verificar sesión inicial
    authService.getCurrentUser()
      .then(user => setUser(user))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Suscribirse a cambios de sesión (login/logout/token refresh)
    const { data: { subscription } } = authService.onAuthStateChange((session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setLoading]);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Rutas de Onboarding (Protegidas pero para cualquier rol que le falte onboarding) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/teacher-onboarding" element={<TeacherOnboardingPage />} />
          </Route>
          
          {/* Rutas Protegidas (Solo Admin) */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="classes" element={<ClassesPage />} />
              <Route path="plans" element={<PlansPage />} />
              <Route path="finances" element={<FinancesPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="teachers" element={<TeachersPage />} />
              <Route path="enrollments" element={<EnrollmentsPage />} />
              <Route path="calendar" element={<AdminCalendarPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Rutas Protegidas (Solo Alumno) */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
