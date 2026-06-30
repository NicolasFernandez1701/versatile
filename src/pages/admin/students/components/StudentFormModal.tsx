import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useUsersStore } from '@/core/store/useUsersStore';
import { usersService } from '@/core/services';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { Modal, Input, Button } from '@/components/ui';
import { useAuthStore } from '@/core/store/useAuthStore';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string | null; // Si viene null, estamos creando. Si no, editando.
  onSuccess: () => void;
}

export function StudentFormModal({ isOpen, onClose, studentId, onSuccess }: StudentFormModalProps) {
  const { current_studio_id } = useAuthStore();
  const { showError, showSuccess } = useAlert();
  const isEditing = !!studentId;
  const { students } = useUsersStore();

  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // Edit Specific
  const [promoDiscountPct, setPromoDiscountPct] = useState(0);
  const [promoExpirationDate, setPromoExpirationDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEditing && studentId) {
        const student = students.find((s) => s.id === studentId);
        if (student) {
          setFullName(student.full_name || '');
          setEmail(student.email || '');
          setPromoDiscountPct(student.promotion_discount_pct || 0);
          setPromoExpirationDate(student.promotion_expiration_date || '');
        }
      } else {
        // Reset for create
        setFullName('');
        setEmail('');
        setPromoDiscountPct(0);
        setPromoExpirationDate('');
      }
    }
  }, [isOpen, isEditing, studentId, students]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!isEditing) {
        // Create new
        await usersService.createUser({
          email,
          full_name,
          role: 'student',
          password: 'password123',
          studio_id: current_studio_id || ''
        });
        showSuccess(
          'Alumno creado con éxito (Contraseña inicial: password123). Luego podrás asignarle un plan editándolo.'
        );
      } else {
        // Update — plan changes now require payment via Finanzas
        await usersService.updateUser(studentId!, {
          full_name,
          promotion_discount_pct: promoDiscountPct,
          promotion_expiration_date: promoExpirationDate || undefined
        });
      }
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Alumno' : 'Registrar Nuevo Alumno'}
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} className="standard-form">
        <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Datos de Acceso</h3>

        <Input
          label="Nombre Completo"
          type="text"
          value={full_name}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <Input
          label="Correo Electrónico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPromoDiscountPct(Number(e.target.value))}
                />
              </div>
              <div style={{ flex: 1, marginBottom: 0 }}>
                <Input
                  label="Vencimiento de Promo"
                  type="date"
                  value={promoExpirationDate}
                  onChange={(e) => setPromoExpirationDate(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

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
          <Button type="submit" variant="primary" loading={isSubmitting}>
            <Check size={20} /> {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
