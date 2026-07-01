import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLoginForm } from './useLoginForm';

const mockLogin = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  authService: {
    login: mockLogin,
  },
}));

describe('useLoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty email, empty password, no error and loading=false', () => {
    const { result } = renderHook(() => useLoginForm());

    expect(result.current.email).toBe('');
    expect(result.current.password).toBe('');
    expect(result.current.error).toBe('');
    expect(result.current.loading).toBe(false);
  });

  it('updates email and password', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setEmail('test@versatile.com');
      result.current.setPassword('secret123');
    });

    expect(result.current.email).toBe('test@versatile.com');
    expect(result.current.password).toBe('secret123');
  });

  it('clears error when email changes', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setEmail('test@versatile.com');
      result.current.setPassword('secret123');
    });

    act(() => {
      result.current.handleSubmit();
    });

    expect(result.current.error).toBe('');
  });

  it('returns validation error when email is empty', async () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setPassword('secret123');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('Por favor completa todos los campos.');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('returns validation error when email format is invalid', async () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setEmail('not-an-email');
      result.current.setPassword('secret123');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('Ingresá un email válido.');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('returns validation error when password is empty', async () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setEmail('test@versatile.com');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('Por favor completa todos los campos.');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls authService.login with email and password when valid', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setEmail('test@versatile.com');
      result.current.setPassword('secret123');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockLogin).toHaveBeenCalledWith('test@versatile.com', 'secret123');
    expect(result.current.error).toBe('');
  });

  it('sets loading to true while submitting and false after', async () => {
    let resolveLogin: (value: unknown) => void = () => {};
    mockLogin.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );

    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setEmail('test@versatile.com');
      result.current.setPassword('secret123');
    });

    act(() => {
      result.current.handleSubmit();
    });

    await waitFor(() => expect(result.current.loading).toBe(true));

    act(() => {
      resolveLogin(undefined);
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('sets error message when login fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Credenciales inválidas'));

    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.setEmail('test@versatile.com');
      result.current.setPassword('wrong');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('Credenciales inválidas');
    expect(result.current.loading).toBe(false);
  });
});
