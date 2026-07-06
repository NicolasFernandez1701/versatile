import { useState, useEffect, useCallback } from 'react';
import { usersService } from '@/core/services';
import { useAlert } from '@/ui/GlobalAlertProvider';
import { useAuthStore } from '@/core/store/useAuthStore';
import type { UserProfile } from '@/core/types/users.types';

export interface UseStudentFormOptions {
  initialData?: UserProfile | null;
  onSuccess?: () => void;
}

export interface UseStudentFormResult {
  fullName: string;
  email: string;
  promoDiscountPct: number;
  promoExpirationDate: string;
  loading: boolean;
  error: string;
  setField: (field: string, value: string | number) => void;
  reset: () => void;
  handleSubmit: () => Promise<void>;
}

export function useStudentForm({
  initialData,
  onSuccess,
}: UseStudentFormOptions = {}): UseStudentFormResult {
  const { current_studio_id } = useAuthStore();
  const { showError, showSuccess } = useAlert();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [promoDiscountPct, setPromoDiscountPct] = useState(0);
  const [promoExpirationDate, setPromoExpirationDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    if (initialData) {
      setFullName(initialData.full_name || '');
      setEmail(initialData.email || '');
      setPromoDiscountPct(initialData.promotion_discount_pct || 0);
      setPromoExpirationDate(initialData.promotion_expiration_date || '');
    } else {
      setFullName('');
      setEmail('');
      setPromoDiscountPct(0);
      setPromoExpirationDate('');
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
      case 'promoDiscountPct':
        setPromoDiscountPct(Number(value));
        break;
      case 'promoExpirationDate':
        setPromoExpirationDate(stringValue);
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
          role: 'student',
          password: 'password123',
          studio_id: current_studio_id || '',
        });
        showSuccess('Alumno creado con éxito.');
      } else {
        await usersService.updateUser(initialData.id, {
          full_name: fullName,
          email,
          promotion_discount_pct: promoDiscountPct,
          promotion_expiration_date: promoExpirationDate || undefined,
        });
        showSuccess('Alumno actualizado con éxito.');
      }
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      showError(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [
    initialData,
    fullName,
    email,
    promoDiscountPct,
    promoExpirationDate,
    current_studio_id,
    onSuccess,
    showError,
    showSuccess,
  ]);

  return {
    fullName,
    email,
    promoDiscountPct,
    promoExpirationDate,
    loading,
    error,
    setField,
    reset,
    handleSubmit,
  };
}
