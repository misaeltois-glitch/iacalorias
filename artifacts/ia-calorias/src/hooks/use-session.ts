import { useState, useEffect } from 'react';
import { setDeviceFingerprint } from '@workspace/api-client-react';
import { ensureDeviceFingerprint } from '@/lib/fingerprint';
import {
  getFromLS, saveToLS,
  getFromCookie, saveToCookie,
  getFromIDB, saveToIDB,
} from '@/lib/usage-tracker';

export function useSession() {
  const [sessionId, setSessionId] = useState<string>(() => {
    return getFromLS() || getFromCookie() || '';
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Fingerprint is only ever an anti-abuse *signal* sent alongside
      // requests, never the session identity itself — resolve it (cached
      // after first computation) and register it before the sessionId is
      // ever exposed, so the very first API call already carries it.
      const fp = await ensureDeviceFingerprint().catch(() => null);
      if (cancelled) return;
      if (fp) setDeviceFingerprint(fp);

      if (sessionId) {
        saveToCookie(sessionId);
        saveToIDB(sessionId);
        return;
      }

      const fromIDB = await getFromIDB();
      if (cancelled) return;

      if (fromIDB) {
        setSessionId(fromIDB);
        saveToLS(fromIDB);
        saveToCookie(fromIDB);
        return;
      }

      // Brand new visitor (no stored id anywhere): always mint a fresh random
      // id — never derive identity from device characteristics, since two
      // different people on similar devices/browsers (especially ones that
      // block canvas/WebGL fingerprinting) can otherwise collide and end up
      // sharing the same subscriptions row/trial/analysis history.
      const id = crypto.randomUUID();
      setSessionId(id);
      saveToLS(id);
      saveToCookie(id);
      await saveToIDB(id);
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return sessionId;
}
