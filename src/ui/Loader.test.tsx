import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Loader } from './Loader';

describe('Loader', () => {
  it('renderiza spinner y texto default', () => {
    render(<Loader />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    const spinner = document.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('text vacío no renderiza texto', () => {
    render(<Loader text="" />);
    expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
    expect(screen.queryByRole('paragraph')).toBeNull();
    // El spinner sigue presente
    const spinner = document.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('fullScreen=true agrega clase fullscreen', () => {
    const { container } = render(<Loader fullScreen />);
    expect(container.firstElementChild?.className).toContain('fullscreen');
  });

  it('fullScreen=false (default) no tiene clase fullscreen', () => {
    const { container } = render(<Loader />);
    expect(container.firstElementChild?.className).not.toContain('fullscreen');
  });

  it('size=small aplica clase small al spinner', () => {
    render(<Loader size="small" text="" />);
    const spinner = document.querySelector('.spinner');
    expect(spinner?.className).toContain('small');
  });

  it('size=medium (default) aplica clase medium al spinner', () => {
    render(<Loader text="" />);
    const spinner = document.querySelector('.spinner');
    expect(spinner?.className).toContain('medium');
  });

  it('size=large aplica clase large al spinner', () => {
    render(<Loader size="large" text="" />);
    const spinner = document.querySelector('.spinner');
    expect(spinner?.className).toContain('large');
  });

  it('text personalizado se renderiza', () => {
    render(<Loader text="Cargando usuarios..." />);
    expect(screen.getByText('Cargando usuarios...')).toBeInTheDocument();
  });
});
