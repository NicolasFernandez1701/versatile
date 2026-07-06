import { useState, useCallback } from 'react';
import { authService } from '@/core/services';
import { isValidEmail } from '@/core/utils/validation';

export interface UseLoginFormResult {
  email: string;
  password: string;
  loading: boolean;
  error: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  handleSubmit: () => Promise<void>;
}

export function useLoginForm(): UseLoginFormResult {
  const [email, setEmailState] = useState('');
  const [password, setPasswordState] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setEmail = useCallback((value: string) => {
    setEmailState(value);
    setError('');
  }, []);

  const setPassword = useCallback((value: string) => {
    setPasswordState(value);
  }, []);

  const handleSubmit = useCallback(async () => {
    setError('');

    if (!email.trim() || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Ingresá un email válido.');
      return;
    }

    setLoading(true);
    try {
      await authService.login(email.trim(), password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  return {
    email,
    password,
    loading,
    error,
    setEmail,
    setPassword,
    handleSubmit,
  };
}
