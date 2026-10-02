import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useLayoutEffect, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { StudentFormModal } from './StudentFormModal';
import type { UserProfile } from '@/core/types/users.types';
import type { PlanEntity } from '@/core/types/plans.types';

const mockCreateUser = vi.hoisted(() => vi.fn());
const mockUpdateUser = vi.hoisted(() => vi.fn());
const mockAssignStudentPlan = vi.hoisted(() => vi.fn());
const mockGetActivePlans = vi.hoisted(() => vi.fn());
const mockShowAlert = vi.hoisted(() => vi.fn());
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
    assignStudentPlan: mockAssignStudentPlan,
  },
  plansService: {
    getActivePlans: mockGetActivePlans,
  },
}));

vi.mock('@/ui/useAlert', () => ({
  useAlert: () => ({
    showAlert: mockShowAlert,
    showError: mockShowError,
    showSuccess: mockShowSuccess,
  }),
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
  plan_id: 'plan-001',
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

const mockPlans: PlanEntity[] = [
  {
    id: 'plan-001',
    name: 'Plan Básico',
    price: 20000,
    classes_per_week: 2,
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'plan-002',
    name: 'Plan Premium',
    price: 35000,
    classes_per_week: 4,
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

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
    mockAssignStudentPlan.mockResolvedValue({ planChangeAudited: true });
    mockGetActivePlans.mockResolvedValue(mockPlans);
  });

  it('abre un alumno existente con sus valores y no los de otro alumno', () => {
    render(
      <MemoryRouter>
        <StudentFormModal
          isOpen
          onClose={mockOnClose}
          studentId={studentA.id}
          onSuccess={mockOnSuccess}
        />
      </MemoryRouter>,
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
      <MemoryRouter>
        <FirstPaintProbe labels={['Nombre Completo']}>
          <StudentFormModal
            key="stu-a"
            isOpen
            onClose={mockOnClose}
            studentId={studentA.id}
            onSuccess={mockOnSuccess}
          />
        </FirstPaintProbe>
      </MemoryRouter>,
    );

    expect(firstPaint['Nombre Completo']).toBe('Ana Alumna');
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Ana Alumna');

    rerender(
      <MemoryRouter>
        <FirstPaintProbe labels={['Nombre Completo']}>
          <StudentFormModal
            key="stu-b"
            isOpen
            onClose={mockOnClose}
            studentId={studentB.id}
            onSuccess={mockOnSuccess}
          />
        </FirstPaintProbe>
      </MemoryRouter>,
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
      <MemoryRouter>
        <StudentFormModal
          isOpen
          onClose={mockOnClose}
          studentId={null}
          onSuccess={mockOnSuccess}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Registrar Nuevo Alumno')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('');
    expect(screen.getByLabelText('Correo Electrónico')).toHaveValue('');
    expect(screen.queryByLabelText('Descuento Promocional (%)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Plan')).not.toBeInTheDocument();
    expect(screen.getByText(/password123/)).toBeInTheDocument();
  });

  it('mantiene el formulario montado al alternar isOpen sin cambiar la key (contrato aceptado)', () => {
    const { rerender } = render(
      <MemoryRouter>
        <StudentFormModal
          isOpen
          onClose={mockOnClose}
          studentId={studentA.id}
          onSuccess={mockOnSuccess}
        />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Nombre Completo'), {
      target: { value: 'Nombre Editado' },
    });
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Nombre Editado');

    rerender(
      <MemoryRouter>
        <StudentFormModal
          isOpen={false}
          onClose={mockOnClose}
          studentId={studentA.id}
          onSuccess={mockOnSuccess}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByLabelText('Nombre Completo')).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <StudentFormModal
          isOpen
          onClose={mockOnClose}
          studentId={studentA.id}
          onSuccess={mockOnSuccess}
        />
      </MemoryRouter>,
    );

    // The wrapper stays mounted across the toggle: without a key change the hook keeps its state.
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Nombre Editado');
  });

  it('muestra el selector de plan con el plan actual preseleccionado al editar', async () => {
    render(
      <MemoryRouter>
        <StudentFormModal
          isOpen
          onClose={mockOnClose}
          studentId={studentA.id}
          onSuccess={mockOnSuccess}
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText('Plan')).toHaveValue('plan-001'));
  });

  it('asigna el plan elegido al guardar llamando a assignStudentPlan con los ids correctos', async () => {
    render(
      <MemoryRouter>
        <StudentFormModal
          isOpen
          onClose={mockOnClose}
          studentId={studentA.id}
          onSuccess={mockOnSuccess}
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText('Plan')).toHaveValue('plan-001'));

    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'plan-002' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

    await waitFor(() => expect(mockAssignStudentPlan).toHaveBeenCalledWith('stu-a', 'plan-002'));
  });

  it('advierte que la asignación desde el formulario no registra ningún pago', () => {
    render(
      <MemoryRouter>
        <StudentFormModal
          isOpen
          onClose={mockOnClose}
          studentId={studentA.id}
          onSuccess={mockOnSuccess}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/no registra ningún pago/i)).toBeInTheDocument();
  });

  it('muestra el link a Finanzas al editar y no al crear', () => {
    const { unmount } = render(
      <MemoryRouter>
        <StudentFormModal
          isOpen
          onClose={mockOnClose}
          studentId={studentA.id}
          onSuccess={mockOnSuccess}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Ir a Finanzas/ })).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter>
        <StudentFormModal
          isOpen
          onClose={mockOnClose}
          studentId={null}
          onSuccess={mockOnSuccess}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /Ir a Finanzas/ })).not.toBeInTheDocument();
  });

  it('muestra la advertencia de auditoría cuando falla el registro del cambio de plan', async () => {
    mockAssignStudentPlan.mockResolvedValueOnce({ planChangeAudited: false });

    render(
      <MemoryRouter>
        <StudentFormModal
          isOpen
          onClose={mockOnClose}
          studentId={studentA.id}
          onSuccess={mockOnSuccess}
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText('Plan')).toHaveValue('plan-001'));

    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'plan-002' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

    await waitFor(() =>
      expect(mockShowAlert).toHaveBeenCalledWith('Advertencia', expect.any(String)),
    );
  });
});
