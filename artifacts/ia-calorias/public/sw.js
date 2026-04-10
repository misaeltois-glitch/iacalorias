// IA Calorias — Service Worker
// BUILD: 2026-04-09

const SW_VERSION = '2026-04-10-2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e =>
  e.waitUntil(
    // Limpa todos os caches antigos e reivindica controle imediatamente
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
);

// ── Offline API cache (IndexedDB) ─────────────────────────────────────────────
// Caches GET /api/* responses so the last known data is shown when offline.

const DB_NAME = 'ia-calorias-sw-cache';
const DB_VERSION = 1;
const STORE = 'api-responses';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE, { keyPath: 'url' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function cacheApiResponse(url, body) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ url, body, ts: Date.now() });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch (e) {
    // non-fatal
  }
}

async function getCachedApiResponse(url) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readonly');
    const row = await new Promise((res, rej) => {
      const req = tx.objectStore(STORE).get(url);
      req.onsuccess = e => res(e.target.result);
      req.onerror = rej;
    });
    db.close();
    return row ?? null;
  } catch {
    return null;
  }
}

// ── Fetch handler ─────────────────────────────────────────────────────────────

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Navigation (HTML pages) — always network, no cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => fetch(e.request))
    );
    return;
  }

  // GET /api/* — network-first with IDB fallback
  if (e.request.method === 'GET' && url.includes('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then(async res => {
          // Only cache successful JSON responses
          if (res.ok) {
            const clone = res.clone();
            clone.text().then(body => cacheApiResponse(url, body));
          }
          return res;
        })
        .catch(async () => {
          // Offline: serve from IDB
          const cached = await getCachedApiResponse(url);
          if (cached) {
            return new Response(cached.body, {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'X-SW-Cache': 'offline' },
            });
          }
          // No cache — return empty 503
          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        })
    );
    return;
  }
});

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

  // Streak risk às 20h
  if (h === 20 && m < 5) {
    return self.registration.showNotification('🔥 Seu streak está em risco!', {
      body: 'Você ainda não registrou nenhuma refeição hoje. Fotografe agora! 📸',
      icon: ICON, badge: ICON, tag: 'streak-risk', renotify: true,
    });
  }

  const mealNames = {
    '08:00': 'café da manhã', '09:00': 'lanche da manhã',
    '12:00': 'almoço', '13:00': 'almoço',
    '15:00': 'lanche da tarde', '19:00': 'jantar', '21:00': 'ceia',
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
