const SESSION_KEY = 'ia-calorias-session-id';
const DB_NAME = 'NutriAppDB';
const DB_STORE = 'session';
const COOKIE_NAME = 'ia_sess';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) {
        req.result.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getFromIDB(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const get = tx.objectStore(DB_STORE).get('sessionId');
      get.onsuccess = () => resolve(get.result ?? null);
      get.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveToIDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(id, 'sessionId');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export function getFromCookie(): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function saveToCookie(id: string): void {
  try {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(id)}; max-age=31536000; path=/; SameSite=Strict`;
  } catch {
    // ignore
  }
}

export function getFromLS(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveToLS(id: string): void {
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    // ignore
  }
}

export async function syncAllLayers(id: string): Promise<void> {
  saveToLS(id);
  saveToCookie(id);
  await saveToIDB(id);
}
