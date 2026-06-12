import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmModal } from '@/components/ui';

interface AlertContextType {
  showAlert: (title: string, message: string) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export const useAlert = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within GlobalAlertProvider');
  return ctx;
};

export const GlobalAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const showAlert = useCallback((t: string, m: string) => {
    setTitle(t);
    setMessage(m);
    setIsOpen(true);
  }, []);

  const showError = useCallback((m: string) => showAlert('Error', m), [showAlert]);
  const showSuccess = useCallback((m: string) => showAlert('Éxito', m), [showAlert]);

  const close = () => setIsOpen(false);

  return (
    <AlertContext.Provider value={{ showAlert, showError, showSuccess }}>
      {children}
      <ConfirmModal
        isOpen={isOpen}
        title={title}
        message={message}
        onConfirm={close}
        onCancel={close}
        confirmText="OK"
        hideCancel={true}
      />
    </AlertContext.Provider>
  );
};
