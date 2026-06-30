import React, { useState, useEffect, useMemo } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { financesService, plansService } from '@/core/services';
import { usePaymentCalculation } from '@/core/hooks/usePaymentCalculation';
import { formatCurrency } from '@/core/utils/formatCurrency';
import { Modal } from '@/components/ui';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { useAuthStore } from '@/core/store/useAuthStore';
import type { PlanEntity } from '@/core/types/plans.types';
import type { StudentWithPlan } from '@/core/types/finances.types';
import '../finances.css';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecordPaymentModal({ isOpen, onClose, onSuccess }: RecordPaymentModalProps) {
  const { showError, showSuccess } = useAlert();
  const { current_studio_id } = useAuthStore();
  const [students, setStudents] = useState<StudentWithPlan[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchText, setStudentSearchText] = useState('');
  const [availablePlans, setAvailablePlans] = useState<PlanEntity[]>([]);

  // Payment Details
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia'>('transferencia');
  const [applyLateFee, setApplyLateFee] = useState(false);
  const [amountOverride, setAmountOverride] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Plan Change
  const [isPlanChange, setIsPlanChange] = useState(false);
  const [newPlanId, setNewPlanId] = useState('');

  // Date context
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
  const selectedPlan = isPlanChange
    ? availablePlans.find((p) => p.id === newPlanId) || currentPlan
    : currentPlan;

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
    [selectedPlan]
  );

  const { calculation, loading: calculationLoading, isFirstPayment } = usePaymentCalculation({
      studentId: selectedStudentId || null,
      plan: planInfo,
      paymentMethod,
      promoDiscountPct,
      applyLateFee,
    });

  const finalAmount =
    amountOverride !== '' ? Number(amountOverride) : (calculation?.total ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedPlan || !calculation) {
      showError('Seleccione un alumno con plan activo.');
      return;
    }
    if (isPlanChange && !newPlanId) {
      showError('Seleccione el nuevo plan.');
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
      showSuccess(isPlanChange ? 'Pago y cambio de plan registrados con éxito.' : 'Pago registrado con éxito.');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      showError('Error al registrar el pago.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Cobro" maxWidth="850px">
      <div className="payment-grid" style={{ marginBottom: '1.5rem', width: '100%' }}>
        {/* Formulario Principal */}
        <form id="record-payment-form" onSubmit={handleSubmit} className="standard-form">
          <div className="form-group">
            <label>Alumno</label>
            <input
              list="students-list"
              type="text"
              placeholder="Seleccionar alumno..."
              value={studentSearchText}
              onChange={(e) => {
                setStudentSearchText(e.target.value);
                const found = students.find(
                  (s) =>
                    `${s.full_name} ${s.plans ? `(${s.plans.name})` : '(Sin Plan)'}` ===
                    e.target.value
                );
                if (found) {
                  setSelectedStudentId(found.id);
                  setAmountOverride('');
                } else {
                  setSelectedStudentId('');
                }
              }}
              required
            />
            <datalist id="students-list">
              {students.map((s) => (
                <option
                  key={s.id}
                  value={`${s.full_name} ${s.plans ? `(${s.plans.name})` : '(Sin Plan)'}`}
                />
              ))}
            </datalist>
            {!currentPlan && selectedStudentId && (
              <small className="text-danger" style={{ display: 'block', marginTop: '0.5rem' }}>
                <AlertTriangle
                  size={14}
                  style={{ display: 'inline', verticalAlign: 'text-bottom' }}
                />{' '}
                El alumno no tiene un plan asignado.
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Método de Pago</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'efectivo' | 'transferencia')}>
              <option value="transferencia">Transferencia / MercadoPago</option>
              <option value="efectivo">Efectivo (-15%)</option>
            </select>
          </div>

          <div
            className="form-group checkbox-group"
            style={{ background: 'rgba(255, 118, 117, 0.1)', padding: '1rem', borderRadius: '8px' }}
          >
            <label>
              <input
                type="checkbox"
                checked={applyLateFee}
                onChange={(e) => setApplyLateFee(e.target.checked)}
              />
              Aplicar recargo por mora (+20%)
            </label>
            <small className="text-secondary" style={{ display: 'block', marginTop: '0.5rem' }}>
              Hoy es día {today.getDate()}. {isAfter10th ? 'Corresponde mora.' : 'Aún en término.'}
            </small>
          </div>

          {selectedStudentId && currentPlan && (
            <div
              className="form-group checkbox-group"
              style={{ background: 'rgba(52, 152, 219, 0.1)', padding: '1rem', borderRadius: '8px' }}
            >
              <label>
                <input
                  type="checkbox"
                  checked={isPlanChange}
                  aria-label="Cambiar plan"
                  onChange={(e) => {
                    setIsPlanChange(e.target.checked);
                    if (!e.target.checked) setNewPlanId('');
                  }}
                />
                Cambiar plan
              </label>
              <small className="text-secondary" style={{ display: 'block', marginTop: '0.5rem' }}>
                Plan actual: {currentPlan.name}. Al cambiar se registrará un pago prorrateado por el nuevo plan.
              </small>
            </div>
          )}

          {isPlanChange && (
            <div className="form-group">
              <label>Nuevo Plan</label>
              <select
                value={newPlanId}
                onChange={(e) => setNewPlanId(e.target.value)}
                required
                aria-label="Nuevo Plan"
              >
                <option value="">Seleccionar nuevo plan...</option>
                {availablePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.price})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label>Monto Final a Cobrar ($) (Override Manual)</label>
            <input
              type="number"
              value={amountOverride}
              onChange={(e) => setAmountOverride(e.target.value)}
              placeholder={
                calculation
                  ? `Automático: ${formatCurrency(calculation.total)}`
                  : ''
              }
            />
          </div>
        </form>

        {/* Panel de Desglose (Preview) */}
        {selectedStudentId && selectedPlan && calculation ? (
          <div className="breakdown-panel">
            <h3 className="breakdown-title">Desglose Financiero</h3>

            {isPlanChange && (
              <div className="breakdown-row" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                <span>Cambio de plan</span>
                <span>{currentPlan?.name} → {selectedPlan.name}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="breakdown-row">
                <span className="text-secondary">Plan Base ({selectedPlan.name})</span>
                <span>{formatCurrency(calculation.proratedBase)}</span>
              </div>

              {promoDiscountPct > 0 && (
                <div className="breakdown-row" style={{ color: 'var(--success-color)' }}>
                  <span>Promo {promoDiscountPct}% OFF</span>
                  <span>-{formatCurrency(calculation.promoDiscountAmount)}</span>
                </div>
              )}

              {paymentMethod === 'efectivo' && (
                <div className="breakdown-row" style={{ color: 'var(--success-color)' }}>
                  <span>Desc. Efectivo (15%)</span>
                  <span>-{formatCurrency(calculation.cashDiscountAmount)}</span>
                </div>
              )}

              {applyLateFee && (
                <div className="breakdown-row" style={{ color: 'var(--error-color)' }}>
                  <span>Recargo por Mora (20%)</span>
                  <span>+{formatCurrency(calculation.lateFeeAmount)}</span>
                </div>
              )}

              <div className="breakdown-divider"></div>

              <div className="breakdown-total">
                <span>Total Calculado</span>
                <span>{formatCurrency(calculation.total)}</span>
              </div>

              {amountOverride !== '' && (
                <div
                  className="breakdown-total"
                  style={{ color: 'var(--warning-color)', marginTop: '0.5rem' }}
                >
                  <span>Total Sobreescrito</span>
                  <span>{formatCurrency(finalAmount)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className="breakdown-panel breakdown-placeholder"
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.6,
              border: '2px dashed var(--border-color)',
              minHeight: '300px',
              textAlign: 'center',
            }}
          >
            <p style={{ marginBottom: '0.5rem' }}>
              Seleccione un alumno para visualizar
              <br />
              el desglose de la cuota.
            </p>
          </div>
        )}
      </div>

      <div
        className="form-actions"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <button
          type="submit"
          form="record-payment-form"
          className="btn-primary"
          disabled={!selectedPlan || !calculation || calculationLoading || isSubmitting || (isPlanChange && !newPlanId)}
          style={{ minWidth: '200px', justifyContent: 'center' }}
        >
          <Check size={20} /> {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
        </button>
      </div>
    </Modal>
  );
}
