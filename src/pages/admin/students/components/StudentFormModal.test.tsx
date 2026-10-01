import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useLayoutEffect, type ReactNode } from 'react';
import { StudentFormModal } from './StudentFormModal';
import type { UserProfile } from '@/core/types/users.types';

const mockCreateUser = vi.hoisted(() => vi.fn());
const mockUpdateUser = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockOnSuccess = vi.hoisted(() => vi.fn());
const mockOnClose = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());
const mockUseUsersStore = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  usersService: {
    createUser: mockCreateUser,
    updateUser: mockUpdateUser,
  },
}));

vi.mock('@/ui/useAlert', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

vi.mock('@/core/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    (selector?: (state: ReturnType<typeof mockUseAuthStore>) => unknown) => {
      const state = mockUseAuthStore();
      if (typeof selector === 'function') return selector(state);
      return state;
    },
    { getState: () => mockUseAuthStore() },
  ),
}));

vi.mock('@/core/store/useUsersStore', () => ({
  useUsersStore: Object.assign(
    (selector?: (state: ReturnType<typeof mockUseUsersStore>) => unknown) => {
      const state = mockUseUsersStore();
      if (typeof selector === 'function') return selector(state);
      return state;
    },
    { getState: () => mockUseUsersStore() },
  ),
}));

const studentA: UserProfile = {
  id: 'stu-a',
  full_name: 'Ana Alumna',
  email: 'ana@test.com',
  role: 'student',
  promotion_discount_pct: 10,
  promotion_expiration_date: '2026-12-31',
  created_at: '2024-01-01',
};

const studentB: UserProfile = {
  id: 'stu-b',
  full_name: 'Beto Alumno',
  email: 'beto@test.com',
  role: 'student',
  promotion_discount_pct: 20,
  promotion_expiration_date: '2027-06-30',
  created_at: '2024-01-01',
};

const firstPaint: Record<string, string> = {};

function readInputByLabel(labelText: string): string {
  const label = Array.from(document.querySelectorAll('label')).find(
    (element) => element.textContent === labelText,
  );
  const input = label?.htmlFor ? document.getElementById(label.htmlFor) : null;
  return input instanceof HTMLInputElement ? input.value : '__missing__';
}

/**
 * Captures controlled input values at LAYOUT time: after the DOM is committed but
 * before passive effects run, so a post-paint reset cannot hide a stale first frame.
 */
function FirstPaintProbe({ labels, children }: { labels: string[]; children: ReactNode }) {
  useLayoutEffect(() => {
    for (const labelText of labels) {
      firstPaint[labelText] = readInputByLabel(labelText);
    }
  });
  return <>{children}</>;
}

describe('StudentFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-001' });
    mockUseUsersStore.mockReturnValue({ students: [studentA, studentB] });
    mockCreateUser.mockResolvedValue(undefined);
    mockUpdateUser.mockResolvedValue(undefined);
  });

  it('abre un alumno existente con sus valores y no los de otro alumno', () => {
    render(
      <StudentFormModal
        isOpen
        onClose={mockOnClose}
        studentId={studentA.id}
        onSuccess={mockOnSuccess}
      />,
    );

    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Ana Alumna');
    expect(screen.getByLabelText('Correo Electrónico')).toHaveValue('ana@test.com');
    expect(screen.getByLabelText('Descuento Promocional (%)')).toHaveValue(10);
    expect(screen.getByLabelText('Vencimiento de Promo')).toHaveValue('2026-12-31');

    expect(screen.getByLabelText('Nombre Completo')).not.toHaveValue('Beto Alumno');
    expect(screen.getByLabelText('Correo Electrónico')).not.toHaveValue('beto@test.com');
  });

  it('remount con nueva key: el primer frame muestra los valores del nuevo alumno', () => {
    const { rerender } = render(
      <FirstPaintProbe labels={['Nombre Completo']}>
        <StudentFormModal
          key="stu-a"
          isOpen
          onClose={mockOnClose}
          studentId={studentA.id}
          onSuccess={mockOnSuccess}
        />
      </FirstPaintProbe>,
    );

    expect(firstPaint['Nombre Completo']).toBe('Ana Alumna');
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Ana Alumna');

    rerender(
      <FirstPaintProbe labels={['Nombre Completo']}>
        <StudentFormModal
          key="stu-b"
          isOpen
          onClose={mockOnClose}
          studentId={studentB.id}
          onSuccess={mockOnSuccess}
        />
      </FirstPaintProbe>,
    );

    // First frame after the key remount: the new student's values, no previous student values.
    // firstPaint is captured before passive effects, so a reset flash cannot pass this assertion.
    expect(firstPaint['Nombre Completo']).toBe('Beto Alumno');
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Beto Alumno');
    expect(screen.getByLabelText('Nombre Completo')).not.toHaveValue('Ana Alumna');
    expect(screen.getByLabelText('Correo Electrónico')).toHaveValue('beto@test.com');
    expect(screen.getByLabelText('Descuento Promocional (%)')).toHaveValue(20);
    expect(screen.queryByDisplayValue('Ana Alumna')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('ana@test.com')).not.toBeInTheDocument();
  });

  it('abre en modo creación con los valores por defecto cuando studentId es null', () => {
    render(
      <StudentFormModal
        isOpen
        onClose={mockOnClose}
        studentId={null}
        onSuccess={mockOnSuccess}
      />,
    );

    expect(screen.getByText('Registrar Nuevo Alumno')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('');
    expect(screen.getByLabelText('Correo Electrónico')).toHaveValue('');
    expect(screen.queryByLabelText('Descuento Promocional (%)')).not.toBeInTheDocument();
    expect(screen.getByText(/password123/)).toBeInTheDocument();
  });

  it('mantiene el formulario montado al alternar isOpen sin cambiar la key (contrato aceptado)', () => {
    const { rerender } = render(
      <StudentFormModal isOpen onClose={mockOnClose} studentId={studentA.id} onSuccess={mockOnSuccess} />,
    );

    fireEvent.change(screen.getByLabelText('Nombre Completo'), {
      target: { value: 'Nombre Editado' },
    });
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Nombre Editado');

    rerender(
      <StudentFormModal
        isOpen={false}
        onClose={mockOnClose}
        studentId={studentA.id}
        onSuccess={mockOnSuccess}
      />,
    );
    expect(screen.queryByLabelText('Nombre Completo')).not.toBeInTheDocument();

    rerender(
      <StudentFormModal isOpen onClose={mockOnClose} studentId={studentA.id} onSuccess={mockOnSuccess} />,
    );

    // The wrapper stays mounted across the toggle: without a key change the hook keeps its state.
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Nombre Editado');
  });
});
