import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastContainer } from './ToastContainer';
import { useNotificationStore } from '@/core/store/useNotificationStore';
import type { NotificationEntity } from '@/core/types/notifications.types';

const USER_ID = 'user-001';

const baseNotification: NotificationEntity = {
  id: 'ntf-001',
  user_id: USER_ID,
  type: 'daily_summary',
  title: 'Resumen diario',
  body: 'Tenés 3 clases hoy',
  reference_id: null,
  sent_at: '2024-06-15T08:00:00.000Z',
  read_at: null,
};

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      realtimeChannel: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no muestra toasts inicialmente aunque haya notificaciones previas', () => {
    useNotificationStore.setState({ notifications: [baseNotification] });
    render(<ToastContainer />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('muestra un toast cuando llega una nueva notificación', () => {
    render(<ToastContainer />);

    act(() => {
      useNotificationStore.setState({ notifications: [baseNotification] });
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Resumen diario');
    expect(screen.getByRole('alert')).toHaveTextContent('Tenés 3 clases hoy');
  });

  it('auto-elimina el toast después de 5 segundos', async () => {
    render(<ToastContainer />);

    act(() => {
      useNotificationStore.setState({ notifications: [baseNotification] });
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('apila múltiples toasts simultáneos', () => {
    render(<ToastContainer />);

    act(() => {
      useNotificationStore.setState({
        notifications: [
          { ...baseNotification, id: 'ntf-001' },
          { ...baseNotification, id: 'ntf-002', title: 'Segundo toast' },
          { ...baseNotification, id: 'ntf-003', title: 'Tercer toast' },
        ],
      });
    });

    const toasts = screen.getAllByRole('alert');
    expect(toasts).toHaveLength(3);
    expect(toasts[0]).toHaveTextContent('Resumen diario');
    expect(toasts[1]).toHaveTextContent('Segundo toast');
    expect(toasts[2]).toHaveTextContent('Tercer toast');
  });

  it('no muestra toast cuando el documento no está visible', () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });

    render(<ToastContainer />);

    act(() => {
      useNotificationStore.setState({ notifications: [baseNotification] });
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
  });

  it('permite cerrar un toast manualmente', async () => {
    render(<ToastContainer />);

    act(() => {
      useNotificationStore.setState({ notifications: [baseNotification] });
    });

    const closeButton = screen.getByRole('button', { name: /cerrar/i });
    act(() => {
      closeButton.click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
