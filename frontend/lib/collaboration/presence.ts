export type PresenceSnapshot = {
  activeSessions: number;
  activeTabs: number;
};

type PresenceRecord = {
  sessionId: string;
  scopeId: string;
  tabId: string;
  updatedAt: number;
};

const CHANNEL_NAME = "nexus-presence";
const STORAGE_PREFIX = "nexus:presence:";
const HEARTBEAT_MS = 5000;
const STALE_AFTER_MS = 18000;

function newTabId(): string {
  return `tab_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function parsePresence(raw: string | null): PresenceRecord | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PresenceRecord;
    if (
      !parsed ||
      typeof parsed.sessionId !== "string" ||
      typeof parsed.scopeId !== "string" ||
      typeof parsed.tabId !== "string" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function scanScope(scopeId: string, now = Date.now()): PresenceSnapshot {
  if (typeof window === "undefined") {
    return { activeSessions: 0, activeTabs: 0 };
  }

  const scopedPrefix = `${STORAGE_PREFIX}${scopeId}:`;
  const sessions = new Set<string>();
  let activeTabs = 0;

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(scopedPrefix)) {
      continue;
    }

    const record = parsePresence(window.localStorage.getItem(key));
    if (!record || now - record.updatedAt > STALE_AFTER_MS) {
      window.localStorage.removeItem(key);
      continue;
    }

    sessions.add(record.sessionId);
    activeTabs += 1;
  }

  return {
    activeSessions: sessions.size,
    activeTabs
  };
}

export function watchPresence(
  scopeId: string,
  sessionId: string,
  onChange: (snapshot: PresenceSnapshot) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const tabId = newTabId();
  const key = `${STORAGE_PREFIX}${scopeId}:${sessionId}:${tabId}`;
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

  const publish = () => {
    const record: PresenceRecord = {
      scopeId,
      sessionId,
      tabId,
      updatedAt: Date.now()
    };
    window.localStorage.setItem(key, JSON.stringify(record));
    channel?.postMessage({ type: "presence" });
  };

  const refreshSnapshot = () => {
    onChange(scanScope(scopeId));
  };

  const heartbeat = () => {
    publish();
    refreshSnapshot();
  };

  heartbeat();

  const interval = window.setInterval(heartbeat, HEARTBEAT_MS);

  const onStorage = (event: StorageEvent) => {
    if (!event.key || !event.key.startsWith(`${STORAGE_PREFIX}${scopeId}:`)) {
      return;
    }
    refreshSnapshot();
  };

  const onMessage = () => refreshSnapshot();
  const onFocus = () => heartbeat();

  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", onFocus);
  window.addEventListener("visibilitychange", onFocus);
  channel?.addEventListener("message", onMessage);

  const cleanup = () => {
    window.clearInterval(interval);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("visibilitychange", onFocus);
    channel?.removeEventListener("message", onMessage);
    channel?.close();
    window.localStorage.removeItem(key);
  };

  window.addEventListener("beforeunload", cleanup);

  return () => {
    window.removeEventListener("beforeunload", cleanup);
    cleanup();
  };
}
