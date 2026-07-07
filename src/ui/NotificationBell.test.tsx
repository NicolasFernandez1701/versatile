import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBell } from './NotificationBell';
import { useNotificationStore } from '@/core/store/useNotificationStore';

describe('NotificationBell', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      realtimeChannel: null,
    });
  });

  it('renderiza un botón con el icono de campana', () => {
    render(<NotificationBell onClick={() => {}} />);

    const button = screen.getByRole('button', { name: /notificaciones/i });
    expect(button).toBeInTheDocument();
  });

  it('muestra el badge con la cantidad de no leídas cuando es mayor a 0', () => {
    useNotificationStore.setState({ unreadCount: 5 });

    render(<NotificationBell onClick={() => {}} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('oculta el badge cuando no hay notificaciones sin leer', () => {
    render(<NotificationBell onClick={() => {}} />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('muestra “9+” cuando hay más de 9 notificaciones sin leer', () => {
    useNotificationStore.setState({ unreadCount: 12 });

    render(<NotificationBell onClick={() => {}} />);

    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('llama a onClick al hacer click en la campana', () => {
    const onClick = vi.fn();
    render(<NotificationBell onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
