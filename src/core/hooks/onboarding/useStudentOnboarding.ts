import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/core/store/useAuthStore';
import { usersService } from '@/core/services';
import { useAlert } from '@/ui/GlobalAlertProvider';
import { usePasswordStep } from './usePasswordStep';
import { useDateInput } from './useDateInput';
import type { StudentOnboardingPayload } from '@/core/types/users.types';

export interface UseStudentOnboardingResult {
  step: number;
  totalSteps: number;
  isSubmitting: boolean;
  passwordStep: ReturnType<typeof usePasswordStep>;
  dateInput: ReturnType<typeof useDateInput>;
  documentId: string;
  setDocumentId: (value: string) => void;
  age: string;
  setAge: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  occupation: string;
  setOccupation: (value: string) => void;
  emergencyName: string;
  setEmergencyName: (value: string) => void;
  emergencyPhone: string;
  setEmergencyPhone: (value: string) => void;
  chronicDiseases: string;
  setChronicDiseases: (value: string) => void;
  allergies: string;
  setAllergies: (value: string) => void;
  recentInjuries: string;
  setRecentInjuries: (value: string) => void;
  medications: string;
  setMedications: (value: string) => void;
  hasMedicalCert: 'yes' | 'no';
  setHasMedicalCert: (value: 'yes' | 'no') => void;
  medicalCertFile: File | null;
  setMedicalCertFile: (file: File | null) => void;
  currentlyActive: boolean;
  setCurrentlyActive: (value: boolean) => void;
  trainingExperience: string;
  setTrainingExperience: (value: string) => void;
  dailyActivity: string;
  setDailyActivity: (value: string) => void;
  objectives: string[];
  handleObjectiveToggle: (objective: string) => void;
  objectiveOptions: string[];
  preferredSchedule: string;
  setPreferredSchedule: (value: string) => void;
  agreedData: boolean;
  setAgreedData: (value: boolean) => void;
  agreedMedical: boolean;
  setAgreedMedical: (value: boolean) => void;
  agreedRules: boolean;
  setAgreedRules: (value: boolean) => void;
  agreedImage: boolean;
  setAgreedImage: (value: boolean) => void;
  handleNext: () => Promise<void>;
  handlePrev: () => void;
  handleSubmit: () => Promise<void>;
}

export function useStudentOnboarding(): UseStudentOnboardingResult {
  const { user } = useAuthStore();
  const { showError } = useAlert();
  const [searchParams, setSearchParams] = useSearchParams();

  const step = parseInt(searchParams.get('step') || '1', 10);
  const setStep = useCallback(
    (newStep: number) => setSearchParams({ step: newStep.toString() }),
    [setSearchParams],
  );
  const totalSteps = 6;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStep = usePasswordStep();
  const dateInput = useDateInput();

  // Step 2: Datos Personales
  const [documentId, setDocumentId] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Step 3: Historial Médico
  const [chronicDiseases, setChronicDiseases] = useState('');
  const [allergies, setAllergies] = useState('');
  const [recentInjuries, setRecentInjuries] = useState('');
  const [medications, setMedications] = useState('');
  const [hasMedicalCert, setHasMedicalCert] = useState<'yes' | 'no'>('no');
  const [medicalCertFile, setMedicalCertFile] = useState<File | null>(null);

  // Step 4: Estilo de Vida
  const [currentlyActive, setCurrentlyActive] = useState(false);
  const [trainingExperience, setTrainingExperience] = useState('');
  const [dailyActivity, setDailyActivity] = useState('');

  // Step 5: Objetivos
  const [objectives, setObjectives] = useState<string[]>([]);
  const [preferredSchedule, setPreferredSchedule] = useState('');

  const objectiveOptions = useMemo(
    () => [
      'Aumentar masa muscular (Hipertrofia)',
      'Tonificar',
      'Bajar de peso / Control de peso',
      'Mejorar la salud y reducir el estrés',
      'Rehabilitación de lesión',
      'Mejorar rendimiento deportivo',
    ],
    [],
  );

  // Step 6: Legales
  const [agreedData, setAgreedData] = useState(true);
  const [agreedMedical, setAgreedMedical] = useState(true);
  const [agreedRules, setAgreedRules] = useState(true);
  const [agreedImage, setAgreedImage] = useState(true);

  const handleObjectiveToggle = useCallback((objective: string) => {
    setObjectives((prev) =>
      prev.includes(objective) ? prev.filter((o) => o !== objective) : [...prev, objective],
    );
  }, []);

  const formatBirthDate = useCallback((dateValue: string): string | null => {
    if (!dateValue) return null;
    if (dateValue.includes('/')) {
      const [day, month, year] = dateValue.split('/');
      let parsedYear = year;
      if (year && year.length === 2) {
        const y = parseInt(year, 10);
        parsedYear = y > new Date().getFullYear() % 100 ? `19${year}` : `20${year}`;
      }
      return `${parsedYear}-${month}-${day}`;
    }
    return dateValue;
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
    if (step < totalSteps) setStep(step + 1);
  }, [step, passwordStep, setStep, showError]);

  const handlePrev = useCallback(() => {
    if (step > 1) setStep(step - 1);
  }, [step, setStep]);

  const handleSubmit = useCallback(async () => {
    if (!agreedData || !agreedMedical || !agreedRules) {
      showError('Debés aceptar los términos y condiciones obligatorios para continuar.');
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    try {
      const certUrl = medicalCertFile ? medicalCertFile.name : null;
      const formattedDate = formatBirthDate(dateInput.value);

      const payload: StudentOnboardingPayload = {
        document_id: documentId,
        birth_date: formattedDate,
        age: age ? parseInt(age, 10) : null,
        address,
        occupation,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        chronic_diseases: chronicDiseases,
        allergies,
        recent_injuries: recentInjuries,
        medications,
        medical_certificate_url: certUrl,
        medical_certificate_status: certUrl ? 'pending' : null,
        currently_active: currentlyActive,
        training_experience: trainingExperience,
        daily_work_activity: dailyActivity,
        main_objectives: objectives,
        preferred_schedule: preferredSchedule,
        agreed_to_data_protection: agreedData,
        agreed_to_medical_exoneration: agreedMedical,
        agreed_to_facility_rules: agreedRules,
        agreed_to_image_rights: agreedImage,
      };

      await usersService.saveOnboardingDetails(user.id, payload);
      window.location.href = '/';
    } catch (error: unknown) {
      showError(`Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setIsSubmitting(false);
    }
  }, [
    agreedData,
    agreedMedical,
    agreedRules,
    user,
    medicalCertFile,
    dateInput.value,
    formatBirthDate,
    documentId,
    age,
    address,
    occupation,
    emergencyName,
    emergencyPhone,
    chronicDiseases,
    allergies,
    recentInjuries,
    medications,
    currentlyActive,
    trainingExperience,
    dailyActivity,
    objectives,
    preferredSchedule,
    agreedImage,
    showError,
  ]);

  return {
    step,
    totalSteps,
    isSubmitting,
    passwordStep,
    dateInput,
    documentId,
    setDocumentId,
    age,
    setAge,
    address,
    setAddress,
    occupation,
    setOccupation,
    emergencyName,
    setEmergencyName,
    emergencyPhone,
    setEmergencyPhone,
    chronicDiseases,
    setChronicDiseases,
    allergies,
    setAllergies,
    recentInjuries,
    setRecentInjuries,
    medications,
    setMedications,
    hasMedicalCert,
    setHasMedicalCert,
    medicalCertFile,
    setMedicalCertFile,
    currentlyActive,
    setCurrentlyActive,
    trainingExperience,
    setTrainingExperience,
    dailyActivity,
    setDailyActivity,
    objectives,
    handleObjectiveToggle,
    objectiveOptions,
    preferredSchedule,
    setPreferredSchedule,
    agreedData,
    setAgreedData,
    agreedMedical,
    setAgreedMedical,
    agreedRules,
    setAgreedRules,
    agreedImage,
    setAgreedImage,
    handleNext,
    handlePrev,
    handleSubmit,
  };
}
