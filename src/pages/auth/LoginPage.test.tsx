import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginPage } from './LoginPage';

// --- Hoisted mocks ---

const mockNavigateCall = vi.hoisted(() => vi.fn());
const mockLogin = vi.hoisted(() => vi.fn());
const mockLogout = vi.hoisted(() => vi.fn());

const mockAuthStore = vi.hoisted(() => ({
  isAuthenticated: false,
  role: null as string | null,
  isLoading: false,
}));

vi.mock('@/core/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    (selector?: (state: typeof mockAuthStore) => unknown) => {
      if (typeof selector === 'function') return selector(mockAuthStore);
      return mockAuthStore;
    },
    { getState: () => ({ logout: mockLogout }) },
  ),
}));

vi.mock('@/core/services', () => ({
  authService: { login: mockLogin, logout: mockLogout },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Navigate: (props: { to: string; replace?: boolean }) => {
      mockNavigateCall(props);
      return null;
    },
  };
});

// --- Test utilities ---

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.role = null;
    mockAuthStore.isLoading = false;
  });

  // ── test 1: form renders when not authenticated ──

  it('renderiza el formulario de login cuando no está autenticado', () => {
    renderPage();

    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    expect(screen.getByText('Bienvenido de nuevo')).toBeInTheDocument();
  });

  // ── test 2: loading state returns null ──

  it('retorna null cuando isLoading es true', () => {
    mockAuthStore.isLoading = true;

    renderPage();

    expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument();
    expect(screen.queryByText('Bienvenido de nuevo')).not.toBeInTheDocument();
  });

  // ── tests 3‑5: redirect per role ──

  it('redirige a /admin cuando el rol es admin', () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.role = 'admin';

    renderPage();

    expect(mockNavigateCall).toHaveBeenCalledWith({ to: '/admin', replace: true });
  });

  it('redirige a /teacher/dashboard cuando el rol es teacher', () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.role = 'teacher';

    renderPage();

    expect(mockNavigateCall).toHaveBeenCalledWith({ to: '/teacher/dashboard', replace: true });
  });

  it('redirige a /student/dashboard cuando el rol es student', () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.role = 'student';

    renderPage();

    expect(mockNavigateCall).toHaveBeenCalledWith({ to: '/student/dashboard', replace: true });
  });

  // ── test 6: authenticated with no role → "Cuenta sin configurar" ──

  it('muestra pantalla de cuenta sin configurar cuando está autenticado sin rol', () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.role = null;

    renderPage();

    expect(screen.getByText('Cuenta sin configurar')).toBeInTheDocument();
    expect(screen.getByText('Cerrar Sesión y Volver')).toBeInTheDocument();
  });

  // ── test 7: successful login calls authService.login ──

  it('llama a authService.login con email y password en submit exitoso', () => {
    // Never-resolving promise so there's no async state update after the call
    mockLogin.mockReturnValueOnce(new Promise<never>(() => {}));

    renderPage();

    const form = document.querySelector('.auth-form')!;
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'test@versatile.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), {
      target: { value: 'secret123' },
    });
    fireEvent.submit(form);

    expect(mockLogin).toHaveBeenCalledWith('test@versatile.com', 'secret123');
  });

  // ── test 8: validation error when email empty ──

  it('muestra error de validación cuando el email está vacío', () => {
    renderPage();

    const form = document.querySelector('.auth-form')!;
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), {
      target: { value: 'secret123' },
    });
    fireEvent.submit(form);

    expect(screen.getByText('Por favor completa todos los campos.')).toBeInTheDocument();
  });

  // ── test 9: server error displayed ──

  it('muestra mensaje de error cuando authService.login falla', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Credenciales inválidas'));

    renderPage();

    const form = document.querySelector('.auth-form')!;
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'test@versatile.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), {
      target: { value: 'wrong' },
    });
    fireEvent.submit(form);

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
  });

  // ── test 10: password visibility toggle ──

  it('alterna la visibilidad de la contraseña al hacer click en el toggle', () => {
    renderPage();

    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const toggleBtn = document.querySelector('.auth-eye-btn')!;

    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
