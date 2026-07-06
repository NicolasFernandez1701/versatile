const DEFAULT_ICON = '/logo.png';
const DEFAULT_BADGE = '/logo.png';
const DEFAULT_TITLE = 'Versatile';
const DEFAULT_URL = '/';

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = typeof data.title === 'string' && data.title.length > 0
    ? data.title
    : DEFAULT_TITLE;
  const body = typeof data.body === 'string' ? data.body : '';
  const icon = typeof data.icon === 'string' ? data.icon : DEFAULT_ICON;
  const url = data.url;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: DEFAULT_BADGE,
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? DEFAULT_URL;

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const targetUrl = self.location.origin + url;
      const existingClient = clients.find((client) => client.url === targetUrl);

      if (existingClient) {
        return existingClient.focus();
      }

      return self.clients.openWindow(url);
    }),
  );
});
