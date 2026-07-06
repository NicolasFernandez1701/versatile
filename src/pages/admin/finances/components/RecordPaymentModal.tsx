
import { Check, AlertTriangle } from 'lucide-react';
import { useRecordPayment } from '@/core/hooks/admin/useRecordPayment';
import { formatCurrency } from '@/core/utils/formatCurrency';
import { Modal } from '@/ui';
import '../finances.css';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecordPaymentModal({ isOpen, onClose, onSuccess }: RecordPaymentModalProps) {
  const payment = useRecordPayment({ isOpen, onClose, onSuccess });

  const {
    students,
    studentSearchText,
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
    currentPlan,
    selectedPlan,
    finalAmount,
    isAfter10th,
    today,
    calculation,
    calculationLoading,
    handleStudentSearch,
    handleSubmit,
  } = payment;

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
              onChange={handleStudentSearch}
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
            {!currentPlan && payment.selectedStudentId && (
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

          {payment.selectedStudentId && currentPlan && (
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
        {payment.selectedStudentId && selectedPlan && calculation ? (
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

              {payment.promoDiscountPct > 0 && (
                <div className="breakdown-row" style={{ color: 'var(--success-color)' }}>
                  <span>Promo {payment.promoDiscountPct}% OFF</span>
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
