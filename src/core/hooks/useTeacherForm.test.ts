import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTeacherForm } from './useTeacherForm';
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

vi.mock('@/ui/GlobalAlertProvider', () => ({
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

const baseTeacher: UserProfile = {
  id: 'tea-001',
  full_name: 'Ana García',
  email: 'ana@test.com',
  phone: '555-1234',
  role: 'teacher',
  created_at: '2024-01-01',
};

describe('useTeacherForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ current_studio_id: 'studio-001' });
    mockCreateUser.mockResolvedValue(undefined);
    mockUpdateUser.mockResolvedValue(undefined);
  });

  it('initializes with empty fields', () => {
    const { result } = renderHook(() => useTeacherForm());

    expect(result.current.fullName).toBe('');
    expect(result.current.email).toBe('');
    expect(result.current.phone).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('initializes fields from initialData', () => {
    const { result } = renderHook(() => useTeacherForm({ initialData: baseTeacher }));

    expect(result.current.fullName).toBe('Ana García');
    expect(result.current.email).toBe('ana@test.com');
    expect(result.current.phone).toBe('555-1234');
  });

  it('updates fields via setField', () => {
    const { result } = renderHook(() => useTeacherForm());

    act(() => {
      result.current.setField('fullName', 'Laura Díaz');
      result.current.setField('email', 'laura@test.com');
      result.current.setField('phone', '555-9999');
    });

    expect(result.current.fullName).toBe('Laura Díaz');
    expect(result.current.email).toBe('laura@test.com');
    expect(result.current.phone).toBe('555-9999');
  });

  it('resets fields to initialData', () => {
    const { result } = renderHook(() => useTeacherForm({ initialData: baseTeacher }));

    act(() => {
      result.current.setField('fullName', 'Otro');
      result.current.reset();
    });

    expect(result.current.fullName).toBe('Ana García');
    expect(result.current.error).toBe('');
  });

  it('creates a teacher on submit', async () => {
    const { result } = renderHook(() => useTeacherForm({ onSuccess: mockOnSuccess }));

    act(() => {
      result.current.setField('fullName', 'Laura Díaz');
      result.current.setField('email', 'laura@test.com');
      result.current.setField('phone', '555-9999');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'laura@test.com',
      full_name: 'Laura Díaz',
      phone: '555-9999',
      role: 'teacher',
      password: 'password123',
      studio_id: 'studio-001',
    });
    expect(mockShowSuccess).toHaveBeenCalledWith('Profesor creado con éxito.');
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('updates a teacher when initialData is provided', async () => {
    const { result } = renderHook(() =>
      useTeacherForm({ initialData: baseTeacher, onSuccess: mockOnSuccess }),
    );

    act(() => {
      result.current.setField('fullName', 'Ana G.');
      result.current.setField('phone', '555-0000');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockUpdateUser).toHaveBeenCalledWith('tea-001', {
      full_name: 'Ana G.',
      email: 'ana@test.com',
      phone: '555-0000',
    });
    expect(mockShowSuccess).toHaveBeenCalledWith('Profesor actualizado con éxito.');
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('surfaces errors and stops loading on submit failure', async () => {
    mockCreateUser.mockRejectedValueOnce(new Error('Email already exists'));
    const { result } = renderHook(() => useTeacherForm());

    act(() => {
      result.current.setField('fullName', 'Laura Díaz');
      result.current.setField('email', 'laura@test.com');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('Email already exists');
    expect(mockShowError).toHaveBeenCalledWith('Error: Email already exists');
    expect(result.current.loading).toBe(false);
  });

  it('does not submit when required fields are empty', async () => {
    const { result } = renderHook(() => useTeacherForm());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Completa el nombre completo y el correo electrónico.');
    expect(result.current.loading).toBe(false);
  });
});
