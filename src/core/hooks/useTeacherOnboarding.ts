import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { usersService } from '@/core/services';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { usePasswordStep } from './usePasswordStep';
import { useDateInput } from './useDateInput';
import type { Specialty, TeacherOnboardingPayload } from '@/core/types/users.types';

export interface UseTeacherOnboardingResult {
  step: number;
  totalSteps: number;
  isSubmitting: boolean;
  passwordStep: ReturnType<typeof usePasswordStep>;
  address: string;
  setAddress: (value: string) => void;
  dateInput: ReturnType<typeof useDateInput>;
  specialtiesList: Specialty[];
  selectedSpecialties: string[];
  toggleSpecialty: (id: string) => void;
  handleNext: () => Promise<void>;
  handlePrev: () => void;
  handleSubmit: () => Promise<void>;
}

export function useTeacherOnboarding(): UseTeacherOnboardingResult {
  const { user } = useAuthStore();
  const { showError } = useAlert();

  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStep = usePasswordStep();
  const dateInput = useDateInput();

  const [address, setAddress] = useState('');
  const [specialtiesList, setSpecialtiesList] = useState<Specialty[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  useEffect(() => {
    usersService
      .getSpecialties()
      .then((data) => setSpecialtiesList(data))
      .catch((err) => console.error('Error fetching specialties:', err));
  }, []);

  const toggleSpecialty = useCallback((id: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }, []);

  const handleNext = useCallback(async () => {
    if (step === 1) {
      const passwordError = passwordStep.validate();
      if (passwordError) {
        showError(passwordError);
        return;
      }
      setIsSubmitting(true);
      const success = await passwordStep.submitPassword();
      setIsSubmitting(false);
      if (!success) return;
    }
    if (step === 2) {
      if (!address.trim()) {
        showError('Completá tu dirección');
        return;
      }
      if (dateInput.value.length !== 10) {
        showError('La fecha de nacimiento debe tener el formato DD/MM/YYYY');
        return;
      }
    }
    setStep((s) => Math.min(s + 1, totalSteps));
  }, [step, passwordStep, address, dateInput.value, showError]);

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedSpecialties.length === 0) {
      showError('Debés seleccionar al menos una especialidad');
      return;
    }
    if (!user) {
      showError('No hay sesión activa');
      return;
    }

    try {
      setIsSubmitting(true);
      const [dd, mm, yyyy] = dateInput.value.split('/');
      const isoDate = `${yyyy}-${mm}-${dd}`;

      const payload: TeacherOnboardingPayload = {
        address,
        birth_date: isoDate,
        specialties: selectedSpecialties,
      };

      await usersService.saveTeacherOnboardingDetails(user.id, payload);
      window.location.href = '/teacher/dashboard';
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'Error guardando datos');
      setIsSubmitting(false);
    }
  }, [selectedSpecialties, user, dateInput.value, address, showError]);

  return {
    step,
    totalSteps,
    isSubmitting,
    passwordStep,
    address,
    setAddress,
    dateInput,
    specialtiesList,
    selectedSpecialties,
    toggleSpecialty,
    handleNext,
    handlePrev,
    handleSubmit,
  };
}
