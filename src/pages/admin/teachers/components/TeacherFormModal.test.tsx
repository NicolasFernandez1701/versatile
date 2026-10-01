import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useLayoutEffect, type ReactNode } from 'react';
import { TeacherFormModal } from './TeacherFormModal';
import type { UserProfile } from '@/core/types/users.types';

const mockCreateUser = vi.hoisted(() => vi.fn());
const mockUpdateUser = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockOnSuccess = vi.hoisted(() => vi.fn());
const mockOnClose = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());

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

const teacherA: UserProfile = {
  id: 'tea-a',
  full_name: 'Ana Profe',
  email: 'ana@test.com',
  phone: '555-1111',
  role: 'teacher',
  created_at: '2024-01-01',
};

const teacherB: UserProfile = {
  id: 'tea-b',
  full_name: 'Beto Profe',
  email: 'beto@test.com',
  phone: '555-2222',
  role: 'teacher',
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

describe('TeacherFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-001' });
    mockCreateUser.mockResolvedValue(undefined);
    mockUpdateUser.mockResolvedValue(undefined);
  });

  it('abre un profesor existente con sus valores y no los de otro profesor', () => {
    render(
      <TeacherFormModal
        isOpen
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        initialData={teacherA}
      />,
    );

    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Ana Profe');
    expect(screen.getByLabelText('Correo Electrónico')).toHaveValue('ana@test.com');
    expect(screen.getByLabelText('Teléfono')).toHaveValue('555-1111');

    expect(screen.getByLabelText('Nombre Completo')).not.toHaveValue('Beto Profe');
    expect(screen.getByLabelText('Teléfono')).not.toHaveValue('555-2222');
  });

  it('remount con nueva key: el primer frame muestra los valores del nuevo profesor', () => {
    const { rerender } = render(
      <FirstPaintProbe labels={['Nombre Completo']}>
        <TeacherFormModal
          key="tea-a"
          isOpen
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          initialData={teacherA}
        />
      </FirstPaintProbe>,
    );

    expect(firstPaint['Nombre Completo']).toBe('Ana Profe');
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Ana Profe');

    rerender(
      <FirstPaintProbe labels={['Nombre Completo']}>
        <TeacherFormModal
          key="tea-b"
          isOpen
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          initialData={teacherB}
        />
      </FirstPaintProbe>,
    );

    // First frame after the key remount: the new teacher's values, no previous teacher values.
    // firstPaint is captured before passive effects, so a reset flash cannot pass this assertion.
    expect(firstPaint['Nombre Completo']).toBe('Beto Profe');
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Beto Profe');
    expect(screen.getByLabelText('Nombre Completo')).not.toHaveValue('Ana Profe');
    expect(screen.getByLabelText('Correo Electrónico')).toHaveValue('beto@test.com');
    expect(screen.getByLabelText('Teléfono')).toHaveValue('555-2222');
    expect(screen.queryByDisplayValue('Ana Profe')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('555-1111')).not.toBeInTheDocument();
  });

  it('abre en modo creación con los valores por defecto cuando initialData es null', () => {
    render(
      <TeacherFormModal
        isOpen
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        initialData={null}
      />,
    );

    expect(screen.getByText('Registrar Nuevo Profesor')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('');
    expect(screen.getByLabelText('Correo Electrónico')).toHaveValue('');
    expect(screen.getByLabelText('Teléfono')).toHaveValue('');
    expect(screen.getByText(/password123/)).toBeInTheDocument();
  });

  it('mantiene el formulario montado al alternar isOpen sin cambiar la key (contrato aceptado)', () => {
    const { rerender } = render(
      <TeacherFormModal
        isOpen
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        initialData={teacherA}
      />,
    );

    fireEvent.change(screen.getByLabelText('Nombre Completo'), {
      target: { value: 'Nombre Editado' },
    });
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Nombre Editado');

    rerender(
      <TeacherFormModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        initialData={teacherA}
      />,
    );
    expect(screen.queryByLabelText('Nombre Completo')).not.toBeInTheDocument();

    rerender(
      <TeacherFormModal
        isOpen
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        initialData={teacherA}
      />,
    );

    // The wrapper stays mounted across the toggle: without a key change the hook keeps its state.
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Nombre Editado');
  });
});
