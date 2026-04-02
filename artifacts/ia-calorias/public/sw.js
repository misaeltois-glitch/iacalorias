// IA Calorias — Service Worker

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

const ICON = '/icon-512.png';

// Handle push notifications (Web Push API)
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'IA Calorias', {
      body: data.body || 'Hora de registrar sua refeição!',
      icon: ICON,
      badge: ICON,
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
      icon: ICON,
      badge: ICON,
      tag: tag || 'meal-reminder',
      renotify: true,
    });
  }
});

// Periodic Background Sync — dispara mesmo com o browser fechado (Chrome Android)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'meal-reminder') {
    e.waitUntil(checkAndNotify());
  }
});

async function checkAndNotify() {
  // Busca as configurações de lembrete via IDB ou mensagem para o client
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

  if (clients.length > 0) {
    // Tab aberta: pede para o client checar (ele tem acesso ao localStorage)
    clients.forEach(c => c.postMessage({ type: 'CHECK_REMINDERS' }));
    return;
  }

  // Nenhuma tab aberta: mostra notificação genérica
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const hhmm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const mealNames = {
    '08:00': 'café da manhã', '09:00': 'lanche da manhã',
    '12:00': 'almoço', '13:00': 'almoço',
    '15:00': 'lanche da tarde', '19:00': 'jantar', '20:00': 'jantar', '21:00': 'ceia',
  };

  const meal = mealNames[hhmm];
  if (!meal) return;

  return self.registration.showNotification('IA Calorias', {
    body: `Hora de registrar seu ${meal}! 📸`,
    icon: ICON,
    badge: ICON,
    tag: `meal-${hhmm}`,
    renotify: true,
  });
}

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
