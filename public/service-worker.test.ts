import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

interface MockClient {
  url: string;
  focus: ReturnType<typeof vi.fn>;
}

interface MockNotification {
  close: ReturnType<typeof vi.fn>;
  data?: { url?: string };
}

interface MockSelf {
  addEventListener: ReturnType<typeof vi.fn>;
  registration: {
    showNotification: ReturnType<typeof vi.fn>;
  };
  clients: {
    matchAll: ReturnType<typeof vi.fn>;
    openWindow: ReturnType<typeof vi.fn>;
  };
  location: {
    origin: string;
  };
}

function loadServiceWorker(mockSelf: MockSelf): void {
  const filePath = resolve(__dirname, 'service-worker.js');
  const code = readFileSync(filePath, 'utf-8');

  // eslint-disable-next-line no-new-func
  const run = new Function('self', code);
  run(mockSelf);
}

function getHandler(mockSelf: MockSelf, event: string): (...args: unknown[]) => Promise<unknown> {
  const calls = mockSelf.addEventListener.mock.calls;
  const found = calls.find((call) => call[0] === event);
  expect(found).toBeDefined();
  return found![1] as (...args: unknown[]) => Promise<unknown>;
}

describe('service-worker', () => {
  let mockSelf: MockSelf;
  let showNotification: ReturnType<typeof vi.fn>;
  let matchAll: ReturnType<typeof vi.fn>;
  let openWindow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    showNotification = vi.fn().mockResolvedValue(undefined);
    matchAll = vi.fn().mockResolvedValue([]);
    openWindow = vi.fn().mockResolvedValue(undefined);

    mockSelf = {
      addEventListener: vi.fn(),
      registration: { showNotification },
      clients: { matchAll, openWindow },
      location: { origin: 'https://app.versatile.test' },
    };
  });

  describe('push event', () => {
    it('should display an OS notification from push payload', async () => {
      loadServiceWorker(mockSelf);
      const handler = getHandler(mockSelf, 'push');

      const payload = { title: 'Clase en 1 hora', body: 'Pilates a las 10:00' };
      const event = {
        data: { json: () => payload },
        waitUntil: vi.fn((promise: Promise<unknown>) => promise),
      };

      await handler(event);

      expect(showNotification).toHaveBeenCalledWith('Clase en 1 hora', {
        body: 'Pilates a las 10:00',
        icon: '/logo.png',
        badge: '/logo.png',
        data: { url: undefined },
      });
    });

    it('should use custom icon and url when provided', async () => {
      loadServiceWorker(mockSelf);
      const handler = getHandler(mockSelf, 'push');

      const payload = {
        title: 'Resumen diario',
        body: 'Tenés 3 clases hoy',
        icon: '/custom-icon.png',
        url: '/notifications',
      };
      const event = {
        data: { json: () => payload },
        waitUntil: vi.fn((promise: Promise<unknown>) => promise),
      };

      await handler(event);

      expect(showNotification).toHaveBeenCalledWith('Resumen diario', {
        body: 'Tenés 3 clases hoy',
        icon: '/custom-icon.png',
        badge: '/logo.png',
        data: { url: '/notifications' },
      });
    });

    it('should fall back to a default title when payload is malformed', async () => {
      loadServiceWorker(mockSelf);
      const handler = getHandler(mockSelf, 'push');

      const event = {
        data: { json: () => ({}) },
        waitUntil: vi.fn((promise: Promise<unknown>) => promise),
      };

      await handler(event);

      expect(showNotification).toHaveBeenCalledWith('Versatile', {
        body: '',
        icon: '/logo.png',
        badge: '/logo.png',
        data: { url: undefined },
      });
    });
  });

  describe('notificationclick event', () => {
    it('should close the notification and open the app', async () => {
      loadServiceWorker(mockSelf);
      const handler = getHandler(mockSelf, 'notificationclick');

      const notification: MockNotification = {
        close: vi.fn(),
        data: { url: '/notifications' },
      };
      const event = {
        notification,
        waitUntil: vi.fn((promise: Promise<unknown>) => promise),
      };

      await handler(event);

      expect(notification.close).toHaveBeenCalled();
      expect(matchAll).toHaveBeenCalledWith({ type: 'window' });
      expect(openWindow).toHaveBeenCalledWith('/notifications');
    });

    it('should focus an existing client when the url matches', async () => {
      loadServiceWorker(mockSelf);
      const handler = getHandler(mockSelf, 'notificationclick');

      const existingClient: MockClient = {
        url: 'https://app.versatile.test/notifications',
        focus: vi.fn().mockResolvedValue(undefined),
      };
      matchAll.mockResolvedValue([existingClient]);

      const notification: MockNotification = {
        close: vi.fn(),
        data: { url: '/notifications' },
      };
      const event = {
        notification,
        waitUntil: vi.fn((promise: Promise<unknown>) => promise),
      };

      await handler(event);

      expect(notification.close).toHaveBeenCalled();
      expect(existingClient.focus).toHaveBeenCalled();
      expect(openWindow).not.toHaveBeenCalled();
    });

    it('should default to root url when notification data is missing', async () => {
      loadServiceWorker(mockSelf);
      const handler = getHandler(mockSelf, 'notificationclick');

      const notification: MockNotification = {
        close: vi.fn(),
        data: undefined,
      };
      const event = {
        notification,
        waitUntil: vi.fn((promise: Promise<unknown>) => promise),
      };

      await handler(event);

      expect(openWindow).toHaveBeenCalledWith('/');
    });
  });
});
