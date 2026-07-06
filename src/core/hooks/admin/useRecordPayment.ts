import { useState, useEffect, useMemo, useCallback } from 'react';
import { financesService, plansService } from '@/core/services';
import { usePaymentCalculation } from '../shared/usePaymentCalculation';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useAlert } from '@/ui/GlobalAlertProvider';
import { formatCurrency } from '@/core/utils/formatCurrency';
import type { PlanEntity } from '@/core/types/plans.types';
import type { StudentWithPlan } from '@/core/types/finances.types';

export interface UseRecordPaymentParams {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface UseRecordPaymentResult {
  students: StudentWithPlan[];
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  studentSearchText: string;
  setStudentSearchText: (value: string) => void;
  availablePlans: PlanEntity[];
  paymentMethod: 'efectivo' | 'transferencia';
  setPaymentMethod: (value: 'efectivo' | 'transferencia') => void;
  applyLateFee: boolean;
  setApplyLateFee: (value: boolean) => void;
  amountOverride: string;
  setAmountOverride: (value: string) => void;
  isSubmitting: boolean;
  isPlanChange: boolean;
  setIsPlanChange: (value: boolean) => void;
  newPlanId: string;
  setNewPlanId: (value: string) => void;
  selectedStudent: StudentWithPlan | undefined;
  currentPlan: StudentWithPlan['plans'] | undefined;
  selectedPlan: PlanEntity | StudentWithPlan['plans'] | null | undefined;
  promoDiscountPct: number;
  finalAmount: number;
  isAfter10th: boolean;
  today: Date;
  calculation: ReturnType<typeof usePaymentCalculation>['calculation'];
  calculationLoading: boolean;
  isFirstPayment: boolean;
  handleStudentSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useRecordPayment({
  isOpen,
  onClose,
  onSuccess,
}: UseRecordPaymentParams): UseRecordPaymentResult {
  const { showError, showSuccess } = useAlert();
  const { current_studio_id } = useAuthStore();

  const [students, setStudents] = useState<StudentWithPlan[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchText, setStudentSearchText] = useState('');
  const [availablePlans, setAvailablePlans] = useState<PlanEntity[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia'>('transferencia');
  const [applyLateFee, setApplyLateFee] = useState(false);
  const [amountOverride, setAmountOverride] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPlanChange, setIsPlanChange] = useState(false);
  const [newPlanId, setNewPlanId] = useState('');

  const today = new Date();
  const isAfter10th = today.getDate() > 10;

  useEffect(() => {
    if (isOpen) {
      financesService
        .getStudentsWithPlans(current_studio_id || '')
        .then((data) => setStudents(data))
        .catch(console.error);

      plansService
        .getActivePlans()
        .then((data) => setAvailablePlans(data))
        .catch(console.error);

      setApplyLateFee(isAfter10th);
      setSelectedStudentId('');
      setStudentSearchText('');
      setPaymentMethod('transferencia');
      setAmountOverride('');
      setIsPlanChange(false);
      setNewPlanId('');
    }
  }, [isOpen, isAfter10th, current_studio_id]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const currentPlan = selectedStudent?.plans;

  const selectedPlan = useMemo(() => {
    if (isPlanChange) {
      return availablePlans.find((p) => p.id === newPlanId) || currentPlan;
    }
    return currentPlan;
  }, [isPlanChange, availablePlans, newPlanId, currentPlan]);

  const promoDiscountPct = useMemo(() => {
    if (selectedStudent?.promotion_expiration_date) {
      const promoExp = new Date(selectedStudent.promotion_expiration_date);
      if (promoExp >= today) {
        return Number(selectedStudent.promotion_discount_pct || 0);
      }
    }
    return 0;
  }, [selectedStudent, today]);

  const planInfo = useMemo(
    () =>
      selectedPlan
        ? {
            id: selectedPlan.id,
            price: Number(selectedPlan.price),
            name: selectedPlan.name,
          }
        : null,
    [selectedPlan],
  );

  const { calculation, loading: calculationLoading, isFirstPayment } = usePaymentCalculation({
    studentId: selectedStudentId || null,
    plan: planInfo,
    paymentMethod,
    promoDiscountPct,
    applyLateFee,
    today,
  });

  const finalAmount = amountOverride !== '' ? Number(amountOverride) : (calculation?.total ?? 0);

  const handleStudentSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setStudentSearchText(value);

      const found = students.find((s) => {
        const label = `${s.full_name} ${s.plans ? `(${s.plans.name})` : '(Sin Plan)'}`;
        return label === value;
      });

      if (found) {
        setSelectedStudentId(found.id);
        setAmountOverride('');
      } else {
        setSelectedStudentId('');
      }
    },
    [students],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudent || !selectedPlan || !calculation) {
        showError('Seleccione un alumno con plan activo.');
        return;
      }
      if (isPlanChange && !newPlanId) {
        showError('Seleccione el nuevo plan');
        return;
      }

      setIsSubmitting(true);
      try {
        await financesService.recordPayment({
          student_id: selectedStudentId,
          plan_id: selectedPlan?.id ?? currentPlan?.id,
          amount: finalAmount,
          expiration_date: calculation.expirationDate,
          plan_details: `${selectedPlan?.name ?? currentPlan?.name} - ${formatCurrency(selectedPlan?.price ?? currentPlan?.price)}`,
          payment_method: paymentMethod,
          original_amount: calculation.proratedBase,
          discount_applied: calculation.promoDiscountAmount + calculation.cashDiscountAmount,
          surcharge_applied: calculation.lateFeeAmount,
          late_payment: isAfter10th,
          late_fee_applied: applyLateFee,
          is_first_payment: isFirstPayment,
          ...(isPlanChange && newPlanId
            ? { planChange: { newPlanId, studentId: selectedStudentId } }
            : {}),
        });
        showSuccess(
          isPlanChange ? 'Pago y cambio de plan registrados con éxito.' : 'Pago registrado con éxito.',
        );
        onSuccess();
        onClose();
      } catch (error) {
        console.error(error);
        showError('Error al registrar el pago.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      selectedStudent,
      selectedPlan,
      calculation,
      isPlanChange,
      newPlanId,
      selectedStudentId,
      currentPlan,
      finalAmount,
      paymentMethod,
      isAfter10th,
      applyLateFee,
      isFirstPayment,
      showError,
      showSuccess,
      onSuccess,
      onClose,
    ],
  );

  return {
    students,
    selectedStudentId,
    setSelectedStudentId,
    studentSearchText,
    setStudentSearchText,
    availablePlans,
    paymentMethod,
    setPaymentMethod,
    applyLateFee,
    setApplyLateFee,
    amountOverride,
    setAmountOverride,
    isSubmitting,
    isPlanChange,
    setIsPlanChange,
    newPlanId,
    setNewPlanId,
    selectedStudent,
    currentPlan,
    selectedPlan,
    promoDiscountPct,
    finalAmount,
    isAfter10th,
    today,
    calculation,
    calculationLoading,
    isFirstPayment,
    handleStudentSearch,
    handleSubmit,
  };
}
