import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationPanel } from './NotificationPanel';
import { useNotificationStore } from '@/core/store/useNotificationStore';
import { useAuthStore } from '@/core/store/useAuthStore';
import type { NotificationEntity } from '@/core/types/notifications.types';
import type { AppUser } from '@/core/types/auth.types';

const USER_ID = 'user-001';

vi.mock('@/core/services/notifications.service', () => ({
  notificationsService: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

const mockNotifications: NotificationEntity[] = [
  {
    id: 'ntf-001',
    user_id: USER_ID,
    type: 'daily_summary',
    title: 'Resumen diario',
    body: 'Tenés 3 clases hoy',
    reference_id: null,
    sent_at: '2024-06-15T08:00:00.000Z',
    read_at: null,
  },
  {
    id: 'ntf-002',
    user_id: USER_ID,
    type: 'pre_class_reminder',
    title: 'Recordatorio de clase',
    body: 'Ballet a las 10:00',
    reference_id: 'cls-001',
    sent_at: '2024-06-15T09:30:00.000Z',
    read_at: null,
  },
  {
    id: 'ntf-003',
    user_id: USER_ID,
    type: 'plan_expiration',
    title: 'Plan por vencer',
    body: 'Tu plan vence en 3 días',
    reference_id: 'plan-001',
    sent_at: '2024-06-15T07:00:00.000Z',
    read_at: '2024-06-15T10:00:00.000Z',
  },
];

function renderPanel(props: { isOpen?: boolean; onClose?: () => void } = {}) {
  return render(
    <MemoryRouter>
      <NotificationPanel isOpen={props.isOpen ?? true} onClose={props.onClose ?? vi.fn()} />
    </MemoryRouter>
  );
}

describe('NotificationPanel', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      realtimeChannel: null,
    });
    useAuthStore.setState({
      user: { id: USER_ID } as AppUser,
      activeRole: 'student',
    } as ReturnType<typeof useAuthStore.getState>);
  });

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = renderPanel({ isOpen: false });
    expect(container.innerHTML).toBe('');
  });

  it('renderiza el estado de carga', () => {
    useNotificationStore.setState({ isLoading: true });
    renderPanel();

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('renderiza el estado vacío', () => {
    renderPanel();

    expect(screen.getByText('No tenés notificaciones')).toBeInTheDocument();
  });

  it('renderiza el estado de error', () => {
    useNotificationStore.setState({ error: 'Error de conexión' });
    renderPanel();

    expect(screen.getByText('Error de conexión')).toBeInTheDocument();
  });

  it('lista las notificaciones ordenadas por sent_at descendente', () => {
    useNotificationStore.setState({ notifications: mockNotifications });
    renderPanel();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Recordatorio de clase');
    expect(items[1]).toHaveTextContent('Resumen diario');
    expect(items[2]).toHaveTextContent('Plan por vencer');
  });

  it('muestra el ícono correspondiente según el tipo de notificación', () => {
    useNotificationStore.setState({ notifications: mockNotifications });
    renderPanel();

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('⏰');
    expect(items[1]).toHaveTextContent('📅');
    expect(items[2]).toHaveTextContent('📆');
  });

  it('llama a markAllAsRead al hacer click en "Marcar todo como leído"', async () => {
    const markAllAsReadSpy = vi.spyOn(useNotificationStore.getState(), 'markAllAsRead');
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /marcar todo como leído/i }));

    await waitFor(() => {
      expect(markAllAsReadSpy).toHaveBeenCalledWith(USER_ID);
    });
  });

  it('llama a markAsRead al hacer click en una notificación', async () => {
    useNotificationStore.setState({ notifications: mockNotifications });
    const markAsReadSpy = vi.spyOn(useNotificationStore.getState(), 'markAsRead');
    renderPanel();

    fireEvent.click(screen.getByText('Resumen diario'));

    await waitFor(() => {
      expect(markAsReadSpy).toHaveBeenCalledWith(['ntf-001']);
    });
  });

  it('navega al hacer click en una notificación con reference_id', async () => {
    useNotificationStore.setState({ notifications: mockNotifications });
    const markAsReadSpy = vi.spyOn(useNotificationStore.getState(), 'markAsRead');
    const onClose = vi.fn();
    renderPanel({ onClose });

    fireEvent.click(screen.getByText('Recordatorio de clase'));

    await waitFor(() => {
      expect(markAsReadSpy).toHaveBeenCalledWith(['ntf-002']);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('cierra el panel al hacer click fuera de él', () => {
    const onClose = vi.fn();
    renderPanel({ onClose });

    fireEvent.mouseDown(document.body);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no cierra el panel al hacer click dentro de él', () => {
    const onClose = vi.fn();
    renderPanel({ onClose });

    fireEvent.mouseDown(screen.getByRole('dialog'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
