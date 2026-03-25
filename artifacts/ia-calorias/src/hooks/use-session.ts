import { useState, useEffect } from 'react';
import { generateDeviceFingerprint } from '@/lib/fingerprint';
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
    if (sessionId) {
      saveToCookie(sessionId);
      saveToIDB(sessionId);
      return;
    }

    getFromIDB().then(async (fromIDB) => {
      if (fromIDB) {
        setSessionId(fromIDB);
        saveToLS(fromIDB);
        saveToCookie(fromIDB);
        return;
      }
      const fp = await generateDeviceFingerprint();
      setSessionId(fp);
      saveToLS(fp);
      saveToCookie(fp);
      await saveToIDB(fp);
    });
  }, [sessionId]);

  return sessionId;
}
