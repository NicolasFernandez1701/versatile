import { useState, useCallback } from 'react';
import { usersService } from '@/core/services';
import { useAlert } from '@/core/components/GlobalAlertProvider';

export interface UsePasswordStepResult {
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showNewPassword: boolean;
  toggleShowNewPassword: () => void;
  showConfirmPassword: boolean;
  toggleShowConfirmPassword: () => void;
  isSubmitting: boolean;
  validate: () => string | null;
  submitPassword: () => Promise<boolean>;
}

export function usePasswordStep(): UsePasswordStepResult {
  const { showError } = useAlert();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleShowNewPassword = useCallback(() => {
    setShowNewPassword((prev) => !prev);
  }, []);

  const toggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  const validate = useCallback((): string | null => {
    if (newPassword.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    if (newPassword !== confirmPassword) {
      return 'Las contraseñas no coinciden';
    }
    return null;
  }, [newPassword, confirmPassword]);

  const submitPassword = useCallback(async (): Promise<boolean> => {
    const validationError = validate();
    if (validationError) {
      showError(validationError);
      return false;
    }

    setIsSubmitting(true);
    try {
      await usersService.updatePassword(newPassword);
      return true;
    } catch (error: unknown) {
      showError(`Error al actualizar contraseña: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [newPassword, validate, showError]);

  return {
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showNewPassword,
    toggleShowNewPassword,
    showConfirmPassword,
    toggleShowConfirmPassword,
    isSubmitting,
    validate,
    submitPassword,
  };
}
