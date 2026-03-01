const SESSION_KEY = "nexus_session_id";

function newSessionId(): string {
  return `sess_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "server-session";
  }

  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const sessionId = newSessionId();
  window.localStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
}
