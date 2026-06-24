import React, { useState, useEffect } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { financesService } from '@/core/services';
import { Modal } from '@/components/ui';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import '../finances.css';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecordPaymentModal({ isOpen, onClose, onSuccess }: RecordPaymentModalProps) {
  const { showError, showSuccess } = useAlert();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchText, setStudentSearchText] = useState('');

  // Payment Details
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia'>('transferencia');
  const [applyLateFee, setApplyLateFee] = useState(false);
  const [amountOverride, setAmountOverride] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date context
  const today = new Date();
  const isAfter10th = today.getDate() > 10;

  useEffect(() => {
    if (isOpen) {
      financesService
        .getStudentsWithPlans()
        .then((data) => setStudents(data))
        .catch(console.error);

      setApplyLateFee(isAfter10th);
      setSelectedStudentId('');
      setStudentSearchText('');
      setPaymentMethod('transferencia');
      setAmountOverride('');
    }
  }, [isOpen, isAfter10th]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const plan = selectedStudent?.plans;

  // Calculos Financieros en Vivo
  let basePrice = plan ? Number(plan.price) : 0;
  let promoDiscountPct = 0;

  if (selectedStudent?.promotion_expiration_date) {
    const promoExp = new Date(selectedStudent.promotion_expiration_date);
    if (promoExp >= today) {
      promoDiscountPct = Number(selectedStudent.promotion_discount_pct || 0);
    }
  }

  const promoDiscountAmount = (basePrice * promoDiscountPct) / 100;
  let subtotal = basePrice - promoDiscountAmount;

  let cashDiscountAmount = 0;
  if (paymentMethod === 'efectivo') {
    cashDiscountAmount = subtotal * 0.15;
    subtotal -= cashDiscountAmount;
  }

  let lateFeeAmount = 0;
  if (applyLateFee) {
    lateFeeAmount = basePrice * 0.2;
    subtotal += lateFeeAmount;
  }

  const finalAmount = amountOverride !== '' ? Number(amountOverride) : subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !plan) {
      showError('Seleccione un alumno con plan activo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nextExp = new Date();
      nextExp.setMonth(nextExp.getMonth() + 1);

      await financesService.recordPayment({
        student_id: selectedStudentId,
        plan_id: plan.id,
        amount: finalAmount,
        expiration_date: nextExp.toISOString().split('T')[0],
        plan_details: `${plan.name} - $${plan.price}`,
        payment_method: paymentMethod,
        original_amount: basePrice,
        discount_applied: promoDiscountAmount + cashDiscountAmount,
        surcharge_applied: lateFeeAmount,
        late_payment: isAfter10th,
        late_fee_applied: applyLateFee
      });
      showSuccess('Pago registrado con éxito.');
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
            {!plan && selectedStudentId && (
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
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
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

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label>Monto Final a Cobrar ($) (Override Manual)</label>
            <input
              type="number"
              value={amountOverride}
              onChange={(e) => setAmountOverride(e.target.value)}
              placeholder={`Automático: $${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </div>
        </form>

        {/* Panel de Desglose (Preview) */}
        {selectedStudentId && plan ? (
          <div className="breakdown-panel">
            <h3 className="breakdown-title">Desglose Financiero</h3>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="breakdown-row">
                <span className="text-secondary">Plan Base ({plan.name})</span>
                <span>${basePrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {promoDiscountPct > 0 && (
                <div className="breakdown-row" style={{ color: 'var(--success-color)' }}>
                  <span>Promo {promoDiscountPct}% OFF</span>
                  <span>-${promoDiscountAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}

              {paymentMethod === 'efectivo' && (
                <div className="breakdown-row" style={{ color: 'var(--success-color)' }}>
                  <span>Desc. Efectivo (15%)</span>
                  <span>-${cashDiscountAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}

              {applyLateFee && (
                <div className="breakdown-row" style={{ color: 'var(--error-color)' }}>
                  <span>Recargo por Mora (20%)</span>
                  <span>+${lateFeeAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="breakdown-divider"></div>

              <div className="breakdown-total">
                <span>Total Calculado</span>
                <span>${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {amountOverride !== '' && (
                <div
                  className="breakdown-total"
                  style={{ color: 'var(--warning-color)', marginTop: '0.5rem' }}
                >
                  <span>Total Sobreescrito</span>
                  <span>${finalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
              textAlign: 'center'
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
          borderTop: '1px solid var(--border-color)'
        }}
      >
        <button
          type="submit"
          form="record-payment-form"
          className="btn-primary"
          disabled={!plan || isSubmitting}
          style={{ minWidth: '200px', justifyContent: 'center' }}
        >
          <Check size={20} /> {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
        </button>
      </div>
    </Modal>
  );
}
