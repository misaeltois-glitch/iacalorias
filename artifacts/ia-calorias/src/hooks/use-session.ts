import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'ia-calorias-session-id';

function getOrCreateSession(): string {
  let stored = localStorage.getItem(SESSION_KEY);
  if (!stored) {
    stored = uuidv4();
    localStorage.setItem(SESSION_KEY, stored);
  }
  return stored;
}

export function useSession() {
  const [sessionId] = useState<string>(() => getOrCreateSession());
  return sessionId;
}
