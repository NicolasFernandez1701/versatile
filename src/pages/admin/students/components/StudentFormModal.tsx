import React from 'react';
import { Check } from 'lucide-react';
import { useUsersStore } from '@/core/store/useUsersStore';
import { useStudentForm } from '@/core/hooks/shared/useStudentForm';
import { Modal, Input, Button } from '@/ui';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string | null; // Si viene null, estamos creando. Si no, editando.
  onSuccess: () => void;
}

export function StudentFormModal({ isOpen, onClose, studentId, onSuccess }: StudentFormModalProps) {
  const isEditing = !!studentId;
  const { students } = useUsersStore();

  const initialData = studentId ? students.find((s) => s.id === studentId) ?? null : null;

  const {
    fullName,
    email,
    promoDiscountPct,
    promoExpirationDate,
    loading,
    error,
    setField,
    handleSubmit,
  } = useStudentForm({ initialData, onSuccess });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Alumno' : 'Registrar Nuevo Alumno'}
      maxWidth="600px"
    >
      <form onSubmit={onSubmit} className="standard-form">
        <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Datos de Acceso</h3>

        <Input
          label="Nombre Completo"
          type="text"
          value={fullName}
          onChange={(e) => setField('fullName', e.target.value)}
          required
        />

        <Input
          label="Correo Electrónico"
          type="email"
          value={email}
          onChange={(e) => setField('email', e.target.value)}
          required
          disabled={isEditing}
        />

        {!isEditing && (
          <p
            className="text-secondary"
            style={{ fontSize: '0.85rem', marginTop: '-0.5rem', marginBottom: '1rem' }}
          >
            La contraseña se generará automáticamente como <strong>password123</strong>. El sistema
            obligará al alumno a cambiarla al ingresar por primera vez.
          </p>
        )}

        {isEditing && (
          <>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>
              Promociones
            </h3>

            <div
              style={{
                background: 'rgba(52, 152, 219, 0.1)',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid rgba(52, 152, 219, 0.3)'
              }}
            >
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <strong>Para cambiar de plan</strong>, usá la sección{' '}
                <strong>Finanzas → Registrar Cobro</strong> y activá la opción "Cambiar plan".
                El cambio de plan requiere el registro de un pago.
              </p>
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '1rem', marginBottom: 0 }}>
              <div style={{ flex: 1, marginBottom: 0 }}>
                <Input
                  label="Descuento Promocional (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={promoDiscountPct}
                  onChange={(e) => setField('promoDiscountPct', Number(e.target.value))}
                />
              </div>
              <div style={{ flex: 1, marginBottom: 0 }}>
                <Input
                  label="Vencimiento de Promo"
                  type="date"
                  value={promoExpirationDate}
                  onChange={(e) => setField('promoExpirationDate', e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {error && <div className="error-message">{error}</div>}

        <div
          className="form-actions"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            marginTop: '1.5rem'
          }}
        >
          <Button type="submit" variant="primary" loading={loading}>
            <Check size={20} /> {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
