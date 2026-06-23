import { X } from 'lucide-react';
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={maxWidth ? { maxWidth } : {}}
      >
        <div
          className="modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%'
          }}
        >
          <h2 style={{ margin: 0, flex: 1, textAlign: 'left' }}>{title}</h2>
          <button
            className="action-btn"
            onClick={onClose}
            style={{
              flexShrink: 0,
              marginLeft: '1rem',
              padding: '0.5rem',
              cursor: 'pointer',
              display: 'flex'
            }}
          >
            <X size={24} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
