import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Select } from './Select';

const defaultOptions = [
  { value: '1', label: 'Opción 1' },
  { value: '2', label: 'Opción 2' },
  { value: '3', label: 'Opción 3' },
];

describe('Select', () => {
  it('renderiza opciones del array options', () => {
    render(<Select options={defaultOptions} />);
    expect(screen.getByText('Opción 1')).toBeInTheDocument();
    expect(screen.getByText('Opción 2')).toBeInTheDocument();
    expect(screen.getByText('Opción 3')).toBeInTheDocument();
  });

  it('renderiza label', () => {
    render(<Select label="Mi Select" options={defaultOptions} />);
    expect(screen.getByText('Mi Select')).toBeInTheDocument();
  });

  it('label se asocia al select via htmlFor/id', () => {
    render(<Select label="Elige" id="my-select" options={defaultOptions} />);
    const select = screen.getByLabelText('Elige');
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');
  });

  it('error se muestra como mensaje', () => {
    render(<Select error="Selecciona un valor" options={defaultOptions} />);
    expect(screen.getByText('Selecciona un valor')).toBeInTheDocument();
  });

  it('cambiar selección dispara onChange', () => {
    const handleChange = vi.fn();
    render(<Select options={defaultOptions} onChange={handleChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '2' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('ref forwarding funciona', () => {
    const ref = React.createRef<HTMLSelectElement>();
    render(<Select ref={ref} options={defaultOptions} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('SELECT');
  });

  it('aplica clase input-error cuando hay error', () => {
    render(<Select error="Error" options={defaultOptions} />);
    const select = screen.getByRole('combobox');
    expect(select.className).toContain('input-error');
  });

  it('genera selectId automático si no se provee id', () => {
    render(<Select label="Auto" options={defaultOptions} />);
    const select = screen.getByLabelText('Auto');
    expect(select).toHaveAttribute('id');
    expect(select.id).toMatch(/^select-/);
  });
});
