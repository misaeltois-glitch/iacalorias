import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'ia-calorias-session-id';

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session on mount
    let storedSession = localStorage.getItem(SESSION_KEY);
    
    // Create new session if none exists
    if (!storedSession) {
      storedSession = uuidv4();
      localStorage.setItem(SESSION_KEY, storedSession);
    }
    
    setSessionId(storedSession);
  }, []);

  return sessionId;
}
