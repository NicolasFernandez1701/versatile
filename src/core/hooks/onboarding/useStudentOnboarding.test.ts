import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudentOnboarding } from './useStudentOnboarding';

const mockValidate = vi.hoisted(() => vi.fn());
const mockSubmitPassword = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockSaveOnboardingDetails = vi.hoisted(() => vi.fn());
const mockSetSearchParams = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());
let currentStep = '1';

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
    saveOnboardingDetails: mockSaveOnboardingDetails,
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams({ step: currentStep }), mockSetSearchParams],
  };
});

describe('useStudentOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentStep = '1';
    mockValidate.mockReturnValue(null);
    mockSubmitPassword.mockResolvedValue(true);
    mockSaveOnboardingDetails.mockResolvedValue(undefined);
    mockUseAuthStore.mockReturnValue({ user: { id: 'user-001' } });
  });

  it('blocks advance when step 1 password validation fails', async () => {
    mockValidate.mockReturnValue('Las contraseñas no coinciden');

    const { result } = renderHook(() => useStudentOnboarding());

    await act(async () => {
      await result.current.handleNext();
    });

    expect(mockShowError).toHaveBeenCalledWith('Las contraseñas no coinciden');
    expect(mockSetSearchParams).not.toHaveBeenCalled();
  });

  it('advances from step 1 when password validation succeeds', async () => {
    mockValidate.mockReturnValue(null);

    const { result } = renderHook(() => useStudentOnboarding());

    await act(async () => {
      await result.current.handleNext();
    });

    expect(mockSubmitPassword).toHaveBeenCalled();
    expect(mockSetSearchParams).toHaveBeenCalledWith({ step: '2' });
  });

  it('submits with formatted birth_date and all legal agreements checked', async () => {
    currentStep = '6';

    const { result } = renderHook(() => useStudentOnboarding());

    act(() => {
      result.current.setDocumentId('12345678');
      result.current.dateInput.setValue('25/10/1990');
      result.current.setAge('35');
      result.current.setAddress('Av. Siempre Viva 123');
      result.current.setOccupation('Developer');
      result.current.setEmergencyName('Jane Doe');
      result.current.setEmergencyPhone('555-1234');
      result.current.setChronicDiseases('None');
      result.current.setAllergies('None');
      result.current.setRecentInjuries('None');
      result.current.setMedications('None');
      result.current.setCurrentlyActive(true);
      result.current.setTrainingExperience('1 year');
      result.current.setDailyActivity('sentado');
      result.current.handleObjectiveToggle('Tonificar');
      result.current.setPreferredSchedule('tarde');
      result.current.setAgreedData(true);
      result.current.setAgreedMedical(true);
      result.current.setAgreedRules(true);
      result.current.setAgreedImage(true);
    });

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockSaveOnboardingDetails).toHaveBeenCalledWith(
      'user-001',
      expect.objectContaining({
        document_id: '12345678',
        birth_date: '1990-10-25',
        age: 35,
        address: 'Av. Siempre Viva 123',
        main_objectives: ['Tonificar'],
        agreed_to_data_protection: true,
        agreed_to_medical_exoneration: true,
        agreed_to_facility_rules: true,
        agreed_to_image_rights: true,
      }),
    );
    expect(window.location.href).toBe('/');

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('shows error and does not submit when legal agreements are missing', async () => {
    currentStep = '6';

    const { result } = renderHook(() => useStudentOnboarding());

    act(() => {
      result.current.setAgreedData(false);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockShowError).toHaveBeenCalledWith(
      'Debés aceptar los términos y condiciones obligatorios para continuar.',
    );
    expect(mockSaveOnboardingDetails).not.toHaveBeenCalled();
  });
});
