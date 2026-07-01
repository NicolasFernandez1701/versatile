import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileSwitcher } from './ProfileSwitcher';
import type { StudioMembership } from '../types/auth.types';

const mockUseAuthStore = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('@/core/store/useAuthStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function setupStore(memberships: StudioMembership[], activeRole: string | null) {
  mockUseAuthStore.mockReturnValue({
    memberships,
    activeRole,
    setActiveRole: vi.fn(),
  });
}

describe('ProfileSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no se renderiza cuando el usuario tiene una sola membresía', () => {
    setupStore([{ studio_id: 'studio-1', studio_name: 'Studio', role: 'admin' }], 'admin');

    render(<ProfileSwitcher />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('no se renderiza cuando el usuario no tiene membresías', () => {
    setupStore([], null);

    render(<ProfileSwitcher />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('se renderiza y muestra el rol activo cuando hay múltiples membresías', () => {
    setupStore(
      [
        { studio_id: 'studio-1', studio_name: 'Studio', role: 'admin' },
        { studio_id: 'studio-1', studio_name: 'Studio', role: 'teacher' },
      ],
      'admin',
    );

    render(<ProfileSwitcher />);

    expect(screen.getByRole('button')).toHaveTextContent('Administrador');
  });

  it('abre el dropdown al hacer click y lista todos los roles disponibles', () => {
    setupStore(
      [
        { studio_id: 'studio-1', studio_name: 'Studio', role: 'admin' },
        { studio_id: 'studio-1', studio_name: 'Studio', role: 'teacher' },
        { studio_id: 'studio-1', studio_name: 'Studio', role: 'student' },
      ],
      'admin',
    );

    render(<ProfileSwitcher />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('option', { name: /Administrador/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Profesor/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Alumno/i })).toBeInTheDocument();
  });

  it('al seleccionar un rol llama a setActiveRole y navega al dashboard correspondiente', () => {
    const mockSetActiveRole = vi.fn();
    mockUseAuthStore.mockReturnValue({
      memberships: [
        { studio_id: 'studio-1', studio_name: 'Studio', role: 'admin' },
        { studio_id: 'studio-1', studio_name: 'Studio', role: 'teacher' },
      ],
      activeRole: 'admin',
      setActiveRole: mockSetActiveRole,
    });

    render(<ProfileSwitcher />);

    fireEvent.click(screen.getByRole('button'));
    const teacherOption = screen.getByRole('option', { name: /Profesor/i });
    fireEvent.click(teacherOption.querySelector('button')!);

    expect(mockSetActiveRole).toHaveBeenCalledWith('teacher');
    expect(mockNavigate).toHaveBeenCalledWith('/teacher/dashboard');
  });
});
