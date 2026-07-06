import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renderiza children correctamente', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renderiza con variant primary por defecto', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByText('Primary');
    expect(btn.className).toContain('btn-primary');
  });

  it('renderiza con variant secondary', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByText('Secondary');
    expect(btn.className).toContain('btn-secondary');
  });

  it('renderiza con variant danger usando clase icon-btn text-danger', () => {
    render(<Button variant="danger">Danger</Button>);
    const btn = screen.getByText('Danger');
    expect(btn.className).toContain('icon-btn');
    expect(btn.className).toContain('text-danger');
  });

  it('renderiza con variant icon usando clase icon-btn', () => {
    render(<Button variant="icon">Icon</Button>);
    const btn = screen.getByText('Icon');
    expect(btn.className).toContain('icon-btn');
    expect(btn.className).not.toContain('btn-icon');
  });

  it('loading=true muestra Loader y deshabilita el botón', () => {
    render(<Button loading>Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    // Loader muestra texto default "Cargando..." — pero el Loader interno
    // se renderiza con text="" (ver source), así que no debe aparecer "Cargando..."
    // Lo que sí, el children "Submit" se muestra incluso con loading=true (si variant !== 'icon')
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('loading=true con variant icon no muestra children', () => {
    render(<Button loading variant="icon">IconBtn</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(screen.queryByText('IconBtn')).not.toBeInTheDocument();
  });

  it('icon + children se renderizan juntos', () => {
    render(<Button icon={<span data-testid="my-icon">🔍</span>}>Search</Button>);
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByTestId('my-icon')).toBeInTheDocument();
  });

  it('disabled sin loading respeta disabled', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('className se agrega al botón', () => {
    render(<Button className="extra-class">Styled</Button>);
    const btn = screen.getByText('Styled');
    expect(btn.className).toContain('extra-class');
  });

  it('loading=true sobreescribe disabled visual aunque disabled no esté seteado', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('spreadea props adicionales al button', () => {
    render(<Button data-testid="custom-btn">Test</Button>);
    expect(screen.getByTestId('custom-btn')).toBeInTheDocument();
  });
});
