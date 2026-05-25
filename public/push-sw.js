self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: 'Valentes Connected',
      body: event.data ? event.data.text() : 'Voce tem uma nova notificacao.'
    };
  }

  const title = payload.title || 'Valentes Connected';
  const options = {
    body: payload.body || 'Voce tem uma nova notificacao.',
    icon: payload.icon || '/logo-192.png',
    badge: payload.badge || '/logo-192.png',
    tag: payload.tag || 'valentes-connected',
    data: {
      url: payload.url || '/#/app',
      ...(payload.data || {})
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/#/app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url.includes(self.location.origin));

      if (existingClient) {
        existingClient.focus();
        existingClient.navigate(targetUrl);
        return;
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
