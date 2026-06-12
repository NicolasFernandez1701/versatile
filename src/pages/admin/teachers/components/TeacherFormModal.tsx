import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

import { usersService } from '@/core/services';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { Modal, Input, Button } from '@/components/ui';

interface TeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TeacherFormModal({ isOpen, onClose, onSuccess }: TeacherFormModalProps) {
  const { showError, showSuccess } = useAlert();
  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFullName('');
      setEmail('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await usersService.createUser({
        full_name,
        email,
        role: 'teacher',
      });
      showSuccess('Profesor creado con éxito. La contraseña inicial es password123.');
      onSuccess();
      onClose();
    } catch (error: any) {
      showError(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Nuevo Profesor"
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} className="standard-form">
        <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Datos de Acceso</h3>

        <Input
          label="Nombre Completo"
          type="text"
          value={full_name}
          onChange={e => setFullName(e.target.value)}
          required
        />

        <Input
          label="Correo Electrónico"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>
          La contraseña se generará automáticamente como <strong>password123</strong>. El sistema obligará al profesor a cambiarla al ingresar por primera vez.
        </p>

        <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginTop: '1.5rem' }}>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            <Check size={20} /> {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
