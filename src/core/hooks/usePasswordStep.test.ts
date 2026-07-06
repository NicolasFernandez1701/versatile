import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePasswordStep } from './usePasswordStep';

const mockUpdatePassword = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  usersService: {
    updatePassword: mockUpdatePassword,
  },
}));

vi.mock('@/ui/GlobalAlertProvider', () => ({
  useAlert: () => ({ showError: mockShowError }),
}));

describe('usePasswordStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdatePassword.mockResolvedValue(undefined);
  });

  it('updates password when passwords match and meet minimum length', async () => {
    const { result } = renderHook(() => usePasswordStep());

    act(() => {
      result.current.setNewPassword('abc123');
      result.current.setConfirmPassword('abc123');
    });

    let success = false;
    await act(async () => {
      success = await result.current.submitPassword();
    });

    expect(success).toBe(true);
    expect(mockUpdatePassword).toHaveBeenCalledWith('abc123');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('validate returns mismatch error when passwords differ', () => {
    const { result } = renderHook(() => usePasswordStep());

    act(() => {
      result.current.setNewPassword('abc123');
      result.current.setConfirmPassword('xyz');
    });

    expect(result.current.validate()).toBe('Las contraseñas no coinciden');
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('validate returns length error when password is too short', () => {
    const { result } = renderHook(() => usePasswordStep());

    act(() => {
      result.current.setNewPassword('abc');
      result.current.setConfirmPassword('abc');
    });

    expect(result.current.validate()).toBe('La contraseña debe tener al menos 6 caracteres');
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('surfaces error and resets submitting when updatePassword rejects', async () => {
    mockUpdatePassword.mockRejectedValueOnce(new Error('Auth failure'));

    const { result } = renderHook(() => usePasswordStep());

    act(() => {
      result.current.setNewPassword('abc123');
      result.current.setConfirmPassword('abc123');
    });

    let success = true;
    await act(async () => {
      success = await result.current.submitPassword();
    });

    expect(success).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
    expect(mockShowError).toHaveBeenCalledWith('Error al actualizar contraseña: Auth failure');
  });

  it('toggles password visibility', () => {
    const { result } = renderHook(() => usePasswordStep());

    expect(result.current.showNewPassword).toBe(false);

    act(() => {
      result.current.toggleShowNewPassword();
    });

    expect(result.current.showNewPassword).toBe(true);

    act(() => {
      result.current.toggleShowConfirmPassword();
    });

    expect(result.current.showConfirmPassword).toBe(true);
  });
});
