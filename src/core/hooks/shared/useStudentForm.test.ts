import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStudentForm } from './useStudentForm';
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
const mockUseAuthStore = vi.hoisted(() => vi.fn());

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

const baseStudent: UserProfile = {
  id: 'stu-001',
  full_name: 'María García',
  email: 'maria@test.com',
  role: 'student',
  promotion_discount_pct: 15,
  promotion_expiration_date: '2026-12-31',
  created_at: '2024-01-01',
};

const studentWithPlan: UserProfile = { ...baseStudent, plan_id: 'plan-001' };

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

describe('useStudentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-001' });
    mockCreateUser.mockResolvedValue(undefined);
    mockUpdateUser.mockResolvedValue(undefined);
    mockAssignStudentPlan.mockResolvedValue({ planChangeAudited: true });
    mockGetActivePlans.mockResolvedValue(mockPlans);
  });

  it('initializes with empty fields', () => {
    const { result } = renderHook(() => useStudentForm());

    expect(result.current.fullName).toBe('');
    expect(result.current.email).toBe('');
    expect(result.current.promoDiscountPct).toBe(0);
    expect(result.current.promoExpirationDate).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('initializes fields from initialData', () => {
    const { result } = renderHook(() => useStudentForm({ initialData: baseStudent }));

    expect(result.current.fullName).toBe('María García');
    expect(result.current.email).toBe('maria@test.com');
    expect(result.current.promoDiscountPct).toBe(15);
    expect(result.current.promoExpirationDate).toBe('2026-12-31');
  });

  it('keeps mounted state when initialData changes (no live reset)', () => {
    const { result, rerender } = renderHook(
      ({ initialData }: { initialData: UserProfile | null }) =>
        useStudentForm({ initialData }),
      { initialProps: { initialData: baseStudent } },
    );

    act(() => {
      result.current.setField('fullName', 'María Editada');
    });
    expect(result.current.fullName).toBe('María Editada');

    const otherStudent: UserProfile = {
      ...baseStudent,
      id: 'stu-002',
      full_name: 'Otra Alumna',
      email: 'otra@test.com',
    };
    rerender({ initialData: otherStudent });

    // The parent passing a new initialData object must not wipe the user's edit.
    expect(result.current.fullName).toBe('María Editada');
    expect(result.current.email).toBe('maria@test.com');
  });

  it('reset() applies the latest initialData after it changes', () => {
    const { result, rerender } = renderHook(
      ({ initialData }: { initialData: UserProfile | null }) =>
        useStudentForm({ initialData }),
      { initialProps: { initialData: baseStudent } },
    );

    const otherStudent: UserProfile = {
      ...baseStudent,
      id: 'stu-002',
      full_name: 'Otra Alumna',
      email: 'otra@test.com',
    };
    rerender({ initialData: otherStudent });

    act(() => {
      result.current.reset();
    });

    expect(result.current.fullName).toBe('Otra Alumna');
    expect(result.current.email).toBe('otra@test.com');
  });

  it('updates fields via setField', () => {
    const { result } = renderHook(() => useStudentForm());

    act(() => {
      result.current.setField('fullName', 'Juan Pérez');
      result.current.setField('email', 'juan@test.com');
      result.current.setField('promoDiscountPct', 10);
      result.current.setField('promoExpirationDate', '2026-08-15');
    });

    expect(result.current.fullName).toBe('Juan Pérez');
    expect(result.current.email).toBe('juan@test.com');
    expect(result.current.promoDiscountPct).toBe(10);
    expect(result.current.promoExpirationDate).toBe('2026-08-15');
  });

  it('resets fields to initialData', () => {
    const { result } = renderHook(() => useStudentForm({ initialData: baseStudent }));

    act(() => {
      result.current.setField('fullName', 'Otro');
      result.current.reset();
    });

    expect(result.current.fullName).toBe('María García');
    expect(result.current.error).toBe('');
  });

  it('creates a student on submit', async () => {
    const { result } = renderHook(() => useStudentForm({ onSuccess: mockOnSuccess }));

    act(() => {
      result.current.setField('fullName', 'Juan Pérez');
      result.current.setField('email', 'juan@test.com');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'juan@test.com',
      full_name: 'Juan Pérez',
      role: 'student',
      password: 'password123',
      studio_id: 'studio-001',
    });
    expect(mockShowSuccess).toHaveBeenCalledWith('Alumno creado con éxito.');
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('updates a student when initialData is provided', async () => {
    const { result } = renderHook(() =>
      useStudentForm({ initialData: baseStudent, onSuccess: mockOnSuccess }),
    );

    act(() => {
      result.current.setField('fullName', 'María G.');
      result.current.setField('promoDiscountPct', 20);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockUpdateUser).toHaveBeenCalledWith('stu-001', {
      full_name: 'María G.',
      email: 'maria@test.com',
      promotion_discount_pct: 20,
      promotion_expiration_date: '2026-12-31',
    });
    expect(mockShowSuccess).toHaveBeenCalledWith('Alumno actualizado con éxito.');
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('surfaces errors and stops loading on submit failure', async () => {
    mockCreateUser.mockRejectedValueOnce(new Error('Email already exists'));
    const { result } = renderHook(() => useStudentForm());

    act(() => {
      result.current.setField('fullName', 'Juan Pérez');
      result.current.setField('email', 'juan@test.com');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('Email already exists');
    expect(mockShowError).toHaveBeenCalledWith('Error: Email already exists');
    expect(result.current.loading).toBe(false);
  });

  it('does not submit when required fields are empty', async () => {
    const { result } = renderHook(() => useStudentForm());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Completa el nombre completo y el correo electrónico.');
    expect(result.current.loading).toBe(false);
  });

  it('inicializa planId con el plan actual del alumno', () => {
    const { result } = renderHook(() => useStudentForm({ initialData: studentWithPlan }));

    expect(result.current.planId).toBe('plan-001');
  });

  it('carga los planes activos al editar un alumno existente', async () => {
    const { result } = renderHook(() => useStudentForm({ initialData: studentWithPlan }));

    await waitFor(() => expect(result.current.plansLoading).toBe(false));

    expect(mockGetActivePlans).toHaveBeenCalledTimes(1);
    expect(result.current.availablePlans).toEqual(mockPlans);
  });

  it('no carga planes al crear un alumno nuevo', () => {
    const { result } = renderHook(() => useStudentForm());

    expect(mockGetActivePlans).not.toHaveBeenCalled();
    expect(result.current.availablePlans).toEqual([]);
  });

  it('asigna el nuevo plan sin registrar pago cuando cambia el plan', async () => {
    const { result } = renderHook(() =>
      useStudentForm({ initialData: studentWithPlan, onSuccess: mockOnSuccess }),
    );

    act(() => {
      result.current.setPlanId('plan-002');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockUpdateUser).toHaveBeenCalledWith('stu-001', {
      full_name: 'María García',
      email: 'maria@test.com',
      promotion_discount_pct: 15,
      promotion_expiration_date: '2026-12-31',
    });
    expect(mockAssignStudentPlan).toHaveBeenCalledWith('stu-001', 'plan-002');
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Plan asignado. No se registró ningún pago: acordate de cobrarlo desde Finanzas.',
    );
    expect(mockShowAlert).not.toHaveBeenCalled();
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('no llama a assignStudentPlan cuando el plan no cambió', async () => {
    const { result } = renderHook(() => useStudentForm({ initialData: studentWithPlan }));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockAssignStudentPlan).not.toHaveBeenCalled();
    expect(mockShowSuccess).toHaveBeenCalledWith('Alumno actualizado con éxito.');
  });

  it('no llama a assignStudentPlan cuando no hay plan seleccionado', async () => {
    const { result } = renderHook(() => useStudentForm({ initialData: studentWithPlan }));

    act(() => {
      result.current.setPlanId('');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockAssignStudentPlan).not.toHaveBeenCalled();
  });

  it('advierte cuando falla la auditoría del cambio de plan', async () => {
    mockAssignStudentPlan.mockResolvedValueOnce({ planChangeAudited: false });
    const { result } = renderHook(() => useStudentForm({ initialData: studentWithPlan }));

    act(() => {
      result.current.setPlanId('plan-002');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockAssignStudentPlan).toHaveBeenCalledWith('stu-001', 'plan-002');
    expect(mockShowAlert).toHaveBeenCalledWith('Advertencia', expect.any(String));
    expect(mockShowSuccess).not.toHaveBeenCalled();
  });
});
