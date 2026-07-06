import { Modal } from './Modal';
import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  hideCancel?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isDestructive = false,
  hideCancel = false
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>{message}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        {!hideCancel && (
          <button className="btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
        )}
        <button
          className="btn-primary"
          onClick={onConfirm}
          style={
            isDestructive
              ? { background: 'var(--error-color)', boxShadow: '0 4px 15px rgba(255, 82, 82, 0.3)' }
              : {}
          }
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
