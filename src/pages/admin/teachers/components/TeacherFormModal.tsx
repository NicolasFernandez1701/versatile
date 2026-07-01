import React from 'react';
import { Check } from 'lucide-react';

import { useTeacherForm } from '@/core/hooks/useTeacherForm';
import { Modal, Input, Button } from '@/components/ui';

import type { UserProfile } from '@/core/types/users.types';

interface TeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: UserProfile | null;
}

export function TeacherFormModal({ isOpen, onClose, onSuccess, initialData }: TeacherFormModalProps) {
  const {
    fullName,
    email,
    phone,
    loading,
    error,
    setField,
    handleSubmit,
  } = useTeacherForm({ initialData, onSuccess });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Profesor" : "Registrar Nuevo Profesor"} maxWidth="600px">
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
        />

        <Input
          label="Teléfono"
          type="tel"
          value={phone}
          onChange={(e) => setField('phone', e.target.value)}
        />

        {!initialData && (
          <p
            className="text-secondary"
            style={{ fontSize: '0.85rem', marginTop: '-0.5rem', marginBottom: '1rem' }}
          >
            La contraseña se generará automáticamente como <strong>password123</strong>. El sistema
            obligará al profesor a cambiarla al ingresar por primera vez.
          </p>
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
