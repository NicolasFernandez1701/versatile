import { useState, useMemo, useCallback } from 'react';
import { financesService, plansService } from '@/core/services';
import { usePaymentCalculation } from '../shared/usePaymentCalculation';
import { useAsyncResource } from '../shared/useAsyncResource';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useAlert } from '@/ui/useAlert';
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
  isPlanAssignment: boolean;
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
  calculationError: ReturnType<typeof usePaymentCalculation>['error'];
  isFirstPayment: boolean;
  handleStudentSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useRecordPayment({
  isOpen,
  onClose,
  onSuccess,
}: UseRecordPaymentParams): UseRecordPaymentResult {
  const { showAlert, showError, showSuccess } = useAlert();
  const { current_studio_id } = useAuthStore();

  // Frozen at mount: a per-render `new Date()` would change identity every
  // render and defeat the `promoDiscountPct` useMemo below (exhaustive-deps).
  // Day-boundary rollover mid-session is out of scope for this modal.
  const today = useMemo(() => new Date(), []);
  const isAfter10th = today.getDate() > 10;

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchText, setStudentSearchText] = useState('');
  // Seeded to its reset value: mounting while already open fires no
  // closed->open transition, so this is the only field whose reset would
  // otherwise be skipped on the mount-open path (every other initial value
  // already equals its reset value).
  const [applyLateFee, setApplyLateFee] = useState(isAfter10th);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia'>('transferencia');
  const [amountOverride, setAmountOverride] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlanChange, setIsPlanChange] = useState(false);
  const [newPlanId, setNewPlanId] = useState('');

  // Field resets belong to the closed->open transition and commit in the SAME
  // render pass as the prop change (React "storing information from previous
  // renders"), so an open render never paints stale values. The guard updates
  // `previousOpen` in both directions so the next transition is still seen.
  // Declared delta: resets no longer re-run when `isAfter10th` or
  // `current_studio_id` changes while the modal stays open.
  const [previousOpen, setPreviousOpen] = useState(isOpen);
  if (previousOpen !== isOpen) {
    setPreviousOpen(isOpen);
    if (isOpen) {
      setApplyLateFee(isAfter10th);
      setSelectedStudentId('');
      setStudentSearchText('');
      setPaymentMethod('transferencia');
      setAmountOverride('');
      setIsPlanChange(false);
      setNewPlanId('');
    }
  }

  // Keep-previous-data: the primitive holds the last settled list, so closing
  // and reopening keeps it rendered until the fresh fetch lands. There is no
  // loading flag on this hook's public surface to blank the modal with.
  // `enabled: isOpen` fires one fresh fetch per open; the students resource
  // additionally keys on the studio id, so a studio change while open refetches.
  const studentsResource = useAsyncResource<StudentWithPlan[]>(
    async () => financesService.getStudentsWithPlans(current_studio_id || ''),
    [current_studio_id],
    {
      enabled: isOpen,
      // Parity with the previous inline fetch: log the raw error, no toast.
      onError: (error) => {
        console.error(error);
      },
    },
  );

  const plansResource = useAsyncResource<PlanEntity[]>(
    async () => plansService.getActivePlans(),
    [],
    {
      enabled: isOpen,
      onError: (error) => {
        console.error(error);
      },
    },
  );

  // Memoized so the `?? []` fallback keeps one identity while the resource is
  // empty; the raw logical expression would re-create the array every render
  // and invalidate the memos/callbacks that depend on these lists.
  const students = useMemo(() => studentsResource.data ?? [], [studentsResource.data]);
  const availablePlans = useMemo(() => plansResource.data ?? [], [plansResource.data]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const currentPlan = selectedStudent?.plans;

  // A student without an assigned plan must pick one before a payment can be recorded.
  // Otherwise the flow dead-locks: no plan selector, and submit stays disabled forever.
  const isPlanAssignment = Boolean(selectedStudentId) && !currentPlan;

  const selectedPlan = useMemo(() => {
    if (isPlanChange || isPlanAssignment) {
      return availablePlans.find((p) => p.id === newPlanId) || currentPlan;
    }
    return currentPlan;
  }, [isPlanChange, isPlanAssignment, availablePlans, newPlanId, currentPlan]);

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

  const { calculation, loading: calculationLoading, error: calculationError, isFirstPayment } = usePaymentCalculation({
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
        // Reset the plan selection only when the chosen student actually changes,
        // otherwise retyping the same name would discard a valid selection.
        if (found.id !== selectedStudentId) {
          setIsPlanChange(false);
          setNewPlanId('');
        }
        setSelectedStudentId(found.id);
        setAmountOverride('');
      } else {
        setSelectedStudentId('');
        setIsPlanChange(false);
        setNewPlanId('');
      }
    },
    [students, selectedStudentId],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudent) {
        showError('Seleccione un alumno.');
        return;
      }
      if ((isPlanChange || isPlanAssignment) && !newPlanId) {
        showError('Seleccione el plan.');
        return;
      }
      if (!selectedPlan || !calculation) {
        showError('No se pudo calcular el pago. Verifique el plan del alumno.');
        return;
      }

      setIsSubmitting(true);
      try {
        const { planChangeAudited } = await financesService.recordPayment({
          student_id: selectedStudentId,
          plan_id: selectedPlan.id,
          amount: finalAmount,
          expiration_date: calculation.expirationDate,
          plan_details: `${selectedPlan.name} - ${formatCurrency(selectedPlan.price)}`,
          payment_method: paymentMethod,
          original_amount: calculation.proratedBase,
          discount_applied: calculation.promoDiscountAmount + calculation.cashDiscountAmount,
          surcharge_applied: calculation.lateFeeAmount,
          late_payment: isAfter10th,
          late_fee_applied: applyLateFee,
          is_first_payment: isFirstPayment,
          // `planChange` also covers a first assignment: the service reads the profile's
          // current plan (null) as old_plan_id and persists the new plan_id. Reusing it
          // is what keeps the assignment auditable and atomic with the payment.
          ...((isPlanChange || isPlanAssignment) && newPlanId
            ? { planChange: { newPlanId, studentId: selectedStudentId } }
            : {}),
        });
        // The payment and the assignment already committed. A failed audit must not
        // masquerade as success nor as a payment failure, so warn distinctly.
        if ((isPlanChange || isPlanAssignment) && !planChangeAudited) {
          showAlert(
            'Advertencia',
            'El pago y el plan se registraron, pero no se pudo guardar el registro de auditoría del cambio de plan. Avisá a soporte para conciliarlo.',
          );
        } else {
          showSuccess(
            isPlanChange
              ? 'Pago y cambio de plan registrados con éxito.'
              : isPlanAssignment
                ? 'Pago registrado y plan asignado con éxito.'
                : 'Pago registrado con éxito.',
          );
        }
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
      isPlanAssignment,
      newPlanId,
      selectedStudentId,
      finalAmount,
      paymentMethod,
      isAfter10th,
      applyLateFee,
      isFirstPayment,
      showError,
      showSuccess,
      showAlert,
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
    isPlanAssignment,
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
    calculationError,
    isFirstPayment,
    handleStudentSearch,
    handleSubmit,
  };
}
