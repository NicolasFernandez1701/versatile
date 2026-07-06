import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Input } from './Input';

describe('Input', () => {
  it('renderiza input con placeholder y onChange', () => {
    const handleChange = vi.fn();
    render(<Input placeholder="Enter name" value="" onChange={handleChange} />);
    const input = screen.getByPlaceholderText('Enter name');
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renderiza label y lo asocia al input via htmlFor/id', () => {
    render(<Input label="Username" id="username-input" />);
    const label = screen.getByText('Username');
    expect(label).toBeInTheDocument();
    const input = screen.getByLabelText('Username');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'username-input');
  });

  it('error se muestra como mensaje', () => {
    render(<Input error="Campo requerido" />);
    expect(screen.getByText('Campo requerido')).toBeInTheDocument();
  });

  it('icon se renderiza', () => {
    render(<Input icon={<span data-testid="search-icon">🔍</span>} />);
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('rightElement se renderiza', () => {
    render(<Input rightElement={<span data-testid="eye-icon">👁</span>} />);
    expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
  });

  it('ref forwarding funciona', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('INPUT');
  });

  it('genera inputId automático si no se provee id', () => {
    render(<Input label="Auto" />);
    const input = screen.getByLabelText('Auto');
    expect(input).toHaveAttribute('id');
    expect(input.id).toMatch(/^input-/);
  });

  it('aplica clase input-error cuando hay error', () => {
    render(<Input error="Error" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('input-error');
  });

  it('no renderiza label si label está vacío', () => {
    const { container } = render(<Input />);
    expect(container.querySelector('label')).toBeNull();
  });

  it('no renderiza mensaje de error si error está vacío', () => {
    render(<Input />);
    // Para verificar que NO hay error, usamos el componente general sin error prop
    // El span de error solo aparece si error tiene valor truthy
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
