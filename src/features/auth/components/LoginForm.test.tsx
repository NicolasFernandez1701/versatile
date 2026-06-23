import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from './LoginForm';

const mockLogin = vi.hoisted(() => vi.fn());
vi.mock('@/core/services', () => ({
  authService: { login: mockLogin },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza form con inputs de email y password', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Iniciar Sesión' })
    ).toBeInTheDocument();
  });

  it('Submit exitoso: llama a authService.login con email y password', () => {
    mockLogin.mockResolvedValueOnce({});
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'secret123');
  });

  it('Submit con error: muestra mensaje de error en pantalla', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Credenciales inválidas'));
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
  });

  it('Loading state: botón se deshabilita y muestra "Ingresando..."', async () => {
    mockLogin.mockImplementationOnce(() => new Promise(() => {}));
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    const btn = await screen.findByRole('button', { name: 'Ingresando...' });
    expect(btn).toBeDisabled();
  });

  it('Error vacío del service: muestra fallback "Error al iniciar sesión"', async () => {
    mockLogin.mockRejectedValueOnce(new Error());
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    expect(
      await screen.findByText('Error al iniciar sesión')
    ).toBeInTheDocument();
  });

  it('Inputs capturan cambios del usuario', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Contraseña');

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'mypassword' } });

    expect(emailInput).toHaveValue('user@example.com');
    expect(passwordInput).toHaveValue('mypassword');
  });
});
