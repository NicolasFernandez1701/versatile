import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OverflowMenu } from './OverflowMenu';

describe('OverflowMenu', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onNavigate: vi.fn(),
    currentPath: '/admin',
  };

  it('renders nothing when closed', () => {
    render(<OverflowMenu {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Perfil')).not.toBeInTheDocument();
    expect(screen.queryByText('Alumnos')).not.toBeInTheDocument();
    expect(screen.queryByText('Planes')).not.toBeInTheDocument();
    expect(screen.queryByText('Profesores')).not.toBeInTheDocument();
    expect(screen.queryByText('Matrículas')).not.toBeInTheDocument();
  });

  it('renders all 5 items when open', () => {
    render(<OverflowMenu {...defaultProps} />);
    expect(screen.getByText('Perfil')).toBeInTheDocument();
    expect(screen.getByText('Alumnos')).toBeInTheDocument();
    expect(screen.getByText('Planes')).toBeInTheDocument();
    expect(screen.getByText('Profesores')).toBeInTheDocument();
    expect(screen.getByText('Matrículas')).toBeInTheDocument();
  });

  it('calls onClose when backdrop overlay is clicked', () => {
    render(<OverflowMenu {...defaultProps} />);
    const overlay = document.querySelector('.overflow-overlay');
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay!);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onNavigate with correct path on item click', () => {
    render(<OverflowMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Alumnos'));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('/admin/students');

    fireEvent.click(screen.getByText('Planes'));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('/admin/plans');
  });

  it('highlights active item based on currentPath', () => {
    const { rerender } = render(
      <OverflowMenu {...defaultProps} currentPath="/admin/students" />,
    );
    const alumnosBtn = screen.getByText('Alumnos').closest('button');
    expect(alumnosBtn!.className).toContain('active');

    rerender(<OverflowMenu {...defaultProps} currentPath="/admin" />);
    expect(alumnosBtn!.className).not.toContain('active');
  });
});
