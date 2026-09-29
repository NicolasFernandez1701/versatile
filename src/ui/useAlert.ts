import { createContext, useContext } from 'react';

export interface AlertContextType {
  showAlert: (title: string, message: string) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

export const AlertContext = createContext<AlertContextType | null>(null);

export const useAlert = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within GlobalAlertProvider');
  return ctx;
};
