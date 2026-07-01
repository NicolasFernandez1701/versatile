import { useState, useEffect, useCallback } from 'react';
import { usersService } from '@/core/services';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { useAuthStore } from '@/core/store/useAuthStore';
import type { UserProfile } from '@/core/types/users.types';

export interface UseTeacherFormOptions {
  initialData?: UserProfile | null;
  onSuccess?: () => void;
}

export interface UseTeacherFormResult {
  fullName: string;
  email: string;
  phone: string;
  loading: boolean;
  error: string;
  setField: (field: string, value: string | number) => void;
  reset: () => void;
  handleSubmit: () => Promise<void>;
}

export function useTeacherForm({
  initialData,
  onSuccess,
}: UseTeacherFormOptions = {}): UseTeacherFormResult {
  const { current_studio_id } = useAuthStore();
  const { showError, showSuccess } = useAlert();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    if (initialData) {
      setFullName(initialData.full_name || '');
      setEmail(initialData.email || '');
      setPhone(initialData.phone || '');
    } else {
      setFullName('');
      setEmail('');
      setPhone('');
    }
    setError('');
  }, [initialData]);

  useEffect(() => {
    reset();
  }, [initialData, reset]);

  const setField = useCallback((field: string, value: string | number) => {
    const stringValue = String(value);
    switch (field) {
      case 'fullName':
        setFullName(stringValue);
        break;
      case 'email':
        setEmail(stringValue);
        break;
      case 'phone':
        setPhone(stringValue);
        break;
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    setError('');
    if (!fullName.trim() || !email.trim()) {
      const message = 'Completa el nombre completo y el correo electrónico.';
      setError(message);
      showError(`Error: ${message}`);
      return;
    }

    setLoading(true);
    try {
      if (!initialData) {
        await usersService.createUser({
          email,
          full_name: fullName,
          phone,
          role: 'teacher',
          password: 'password123',
          studio_id: current_studio_id || '',
        });
        showSuccess('Profesor creado con éxito.');
      } else {
        await usersService.updateUser(initialData.id, {
          full_name: fullName,
          email,
          phone,
        });
        showSuccess('Profesor actualizado con éxito.');
      }
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      showError(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [initialData, fullName, email, phone, current_studio_id, onSuccess, showError, showSuccess]);

  return {
    fullName,
    email,
    phone,
    loading,
    error,
    setField,
    reset,
    handleSubmit,
  };
}
