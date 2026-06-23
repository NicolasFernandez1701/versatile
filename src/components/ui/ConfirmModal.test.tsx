import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from './ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirmar acción',
    message: '¿Estás seguro?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renderiza Modal con título y mensaje', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Confirmar acción')).toBeInTheDocument();
    expect(screen.getByText('¿Estás seguro?')).toBeInTheDocument();
  });

  it('click en confirmar llama onConfirm', () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Confirmar'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('click en cancelar llama onCancel', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('isDestructive=true aplica estilo rojo al botón confirmar', () => {
    render(<ConfirmModal {...defaultProps} isDestructive />);
    const confirmBtn = screen.getByText('Confirmar');
    expect(confirmBtn.style.background).toBe('var(--error-color)');
    expect(confirmBtn.style.boxShadow).toBe('0 4px 15px rgba(255, 82, 82, 0.3)');
  });

  it('isDestructive=false (default) no aplica estilos extra', () => {
    render(<ConfirmModal {...defaultProps} />);
    const confirmBtn = screen.getByText('Confirmar');
    expect(confirmBtn.style.background).toBe('');
    expect(confirmBtn.style.boxShadow).toBe('');
  });

  it('hideCancel=true oculta botón cancelar', () => {
    render(<ConfirmModal {...defaultProps} hideCancel />);
    expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
    // Confirmar debe seguir visible
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
  });

  it('hideCancel=false (default) muestra botón cancelar', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('confirmText custom se renderiza', () => {
    render(<ConfirmModal {...defaultProps} confirmText="Sí, eliminar" />);
    expect(screen.getByText('Sí, eliminar')).toBeInTheDocument();
    expect(screen.queryByText('Confirmar')).not.toBeInTheDocument();
  });

  it('cancelText custom se renderiza', () => {
    render(<ConfirmModal {...defaultProps} cancelText="No, volver" />);
    expect(screen.getByText('No, volver')).toBeInTheDocument();
    expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
  });

  it('click en overlay (onClose del Modal) llama onCancel', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);
    // El overlay es el div con clase modal-overlay — el Modal lo renderiza
    const overlay = screen.getByText('Confirmar acción').closest('.modal-overlay')!;
    fireEvent.click(overlay);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
