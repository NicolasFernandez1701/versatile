import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTeacherOnboarding } from './useTeacherOnboarding';

const mockValidate = vi.hoisted(() => vi.fn());
const mockSubmitPassword = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockGetSpecialties = vi.hoisted(() => vi.fn());
const mockSaveTeacherOnboardingDetails = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());

vi.mock('./usePasswordStep', () => ({
  usePasswordStep: () => ({
    newPassword: '',
    setNewPassword: vi.fn(),
    confirmPassword: '',
    setConfirmPassword: vi.fn(),
    showNewPassword: false,
    toggleShowNewPassword: vi.fn(),
    showConfirmPassword: false,
    toggleShowConfirmPassword: vi.fn(),
    isSubmitting: false,
    validate: mockValidate,
    submitPassword: mockSubmitPassword,
  }),
}));

vi.mock('@/core/services', () => ({
  usersService: {
    getSpecialties: mockGetSpecialties,
    saveTeacherOnboardingDetails: mockSaveTeacherOnboardingDetails,
  },
}));

vi.mock('@/ui/GlobalAlertProvider', () => ({
  useAlert: () => ({ showError: mockShowError }),
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

async function advanceToStep(result: { current: ReturnType<typeof useTeacherOnboarding> }, targetStep: number) {
  while (result.current.step < targetStep) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await result.current.handleNext();
    });
  }
}

describe('useTeacherOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockReturnValue(null);
    mockSubmitPassword.mockResolvedValue(true);
    mockGetSpecialties.mockResolvedValue([
      { id: 'spec-001', name: 'Yoga' },
      { id: 'spec-002', name: 'Pilates' },
    ]);
    mockSaveTeacherOnboardingDetails.mockResolvedValue(undefined);
    mockUseAuthStore.mockReturnValue({ user: { id: 'teacher-001' } });
  });

  it('fetches specialties on mount', async () => {
    const { result } = renderHook(() => useTeacherOnboarding());

    await waitFor(() => {
      expect(result.current.specialtiesList).toEqual([
        { id: 'spec-001', name: 'Yoga' },
        { id: 'spec-002', name: 'Pilates' },
      ]);
    });

    expect(mockGetSpecialties).toHaveBeenCalled();
  });

  it('blocks step 2 advance when address is empty', async () => {
    const { result } = renderHook(() => useTeacherOnboarding());

    await advanceToStep(result, 2);

    act(() => {
      result.current.setAddress('');
    });

    await act(async () => {
      await result.current.handleNext();
    });

    expect(mockShowError).toHaveBeenCalledWith('Completá tu dirección');
  });

  it('blocks step 2 advance when birth date is incomplete', async () => {
    const { result } = renderHook(() => useTeacherOnboarding());

    await advanceToStep(result, 2);

    act(() => {
      result.current.setAddress('Av. Siempre Viva 123');
      result.current.dateInput.setValue('25/10');
    });

    await act(async () => {
      await result.current.handleNext();
    });

    expect(mockShowError).toHaveBeenCalledWith(
      'La fecha de nacimiento debe tener el formato DD/MM/YYYY',
    );
  });

  it('submits with selected specialties and formatted birth_date', async () => {
    const { result } = renderHook(() => useTeacherOnboarding());

    await advanceToStep(result, 2);

    act(() => {
      result.current.setAddress('Av. Siempre Viva 123');
      result.current.dateInput.setValue('25/10/1990');
    });

    await act(async () => {
      await result.current.handleNext();
    });

    act(() => {
      result.current.toggleSpecialty('spec-001');
      result.current.toggleSpecialty('spec-002');
    });

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSaveTeacherOnboardingDetails).toHaveBeenCalledWith('teacher-001', {
      address: 'Av. Siempre Viva 123',
      birth_date: '1990-10-25',
      specialties: ['spec-001', 'spec-002'],
    });
    expect(window.location.href).toBe('/teacher/dashboard');

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('shows error when submitting without specialties', async () => {
    const { result } = renderHook(() => useTeacherOnboarding());

    await advanceToStep(result, 2);

    act(() => {
      result.current.setAddress('Av. Siempre Viva 123');
      result.current.dateInput.setValue('25/10/1990');
    });

    await act(async () => {
      await result.current.handleNext();
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockShowError).toHaveBeenCalledWith('Debés seleccionar al menos una especialidad');
    expect(mockSaveTeacherOnboardingDetails).not.toHaveBeenCalled();
  });
});
