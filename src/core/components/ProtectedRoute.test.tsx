import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import type { Role } from '../types/auth.types';

const mockUseAuthStore = vi.hoisted(() => vi.fn());

vi.mock('@/core/store/useAuthStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

function TestChild() {
  return <div data-testid="protected-content">Protected</div>;
}

function renderWithRoute(activeRole: Role | null, role: Role | null, allowedRoles?: Role[]) {
  mockUseAuthStore.mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    user: { profile: { has_completed_onboarding: true } },
    activeRole,
    role,
  });

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/protected" element={<TestChild />} />
        </Route>
        <Route path="/admin" element={<div data-testid="admin-redirect">Admin</div>} />
        <Route path="/teacher/dashboard" element={<div data-testid="teacher-redirect">Teacher</div>} />
        <Route path="/student/dashboard" element={<div data-testid="student-redirect">Student</div>} />
        <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
        <Route path="/onboarding" element={<div data-testid="onboarding-redirect">Onboarding</div>} />
        <Route path="/teacher-onboarding" element={<div data-testid="teacher-onboarding-redirect">Teacher Onboarding</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite el acceso cuando activeRole está dentro de allowedRoles', () => {
    renderWithRoute('admin', 'teacher', ['admin']);

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('deniega el acceso cuando activeRole no está dentro de allowedRoles', () => {
    renderWithRoute('teacher', 'admin', ['admin']);

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('teacher-redirect')).toBeInTheDocument();
  });

  it('ignora role y usa activeRole para la validación del guardia', () => {
    // role dice admin (permitido) pero activeRole dice teacher (no permitido)
    renderWithRoute('teacher', 'admin', ['admin']);

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('teacher-redirect')).toBeInTheDocument();
  });

  it('redirige a /login cuando el usuario no está autenticado', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      activeRole: null,
      role: null,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/protected" element={<TestChild />} />
          </Route>
          <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-redirect')).toBeInTheDocument();
  });

  it('muestra el loader mientras isLoading es true', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      activeRole: null,
      role: null,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/protected" element={<TestChild />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Cargando sesión...')).toBeInTheDocument();
  });
});
