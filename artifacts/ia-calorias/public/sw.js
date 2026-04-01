// IA Calorias — Service Worker

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Handle push notifications (Web Push API — future)
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'IA Calorias', {
      body: data.body || 'Hora de registrar sua refeição!',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'meal-reminder',
      renotify: true,
      data: { url: data.url || '/' },
    })
  );
});

// Show notification when requested from main thread
self.addEventListener('message', e => {
  if (e.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = e.data;
    self.registration.showNotification(title || 'IA Calorias', {
      body: body || 'Hora de registrar sua refeição!',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: tag || 'meal-reminder',
      renotify: true,
    });
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
