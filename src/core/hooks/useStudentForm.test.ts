import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudentForm } from './useStudentForm';
import type { UserProfile } from '@/core/types/users.types';

const mockCreateUser = vi.hoisted(() => vi.fn());
const mockUpdateUser = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockOnSuccess = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  usersService: {
    createUser: mockCreateUser,
    updateUser: mockUpdateUser,
  },
}));

vi.mock('@/core/components/GlobalAlertProvider', () => ({
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

const baseStudent: UserProfile = {
  id: 'stu-001',
  full_name: 'María García',
  email: 'maria@test.com',
  role: 'student',
  promotion_discount_pct: 15,
  promotion_expiration_date: '2026-12-31',
  created_at: '2024-01-01',
};

describe('useStudentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-001' });
    mockCreateUser.mockResolvedValue(undefined);
    mockUpdateUser.mockResolvedValue(undefined);
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
});
