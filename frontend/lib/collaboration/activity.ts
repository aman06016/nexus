export type ActivityEventType =
  | "news-update"
  | "stream-status"
  | "admin-action"
  | "workspace-update"
  | "page-refresh";

export type ActivityEvent = {
  type: ActivityEventType;
  at: number;
  label?: string;
};

const EVENT_NAME = "nexus:activity";
const STORAGE_KEY = "nexus:last-activity";

export function emitActivityEvent(type: ActivityEventType, label?: string) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: ActivityEvent = {
    type,
    at: Date.now(),
    label
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent<ActivityEvent>(EVENT_NAME, { detail: payload }));
}

export function getLastActivityEvent(): ActivityEvent | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ActivityEvent;
    if (!parsed || typeof parsed.at !== "number" || typeof parsed.type !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function subscribeActivityEvents(listener: (event: ActivityEvent) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onEvent = (event: Event) => {
    const custom = event as CustomEvent<ActivityEvent>;
    if (custom.detail) {
      listener(custom.detail);
    }
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) {
      return;
    }

    try {
      const parsed = JSON.parse(event.newValue) as ActivityEvent;
      if (parsed && typeof parsed.at === "number" && typeof parsed.type === "string") {
        listener(parsed);
      }
    } catch {}
  };

  window.addEventListener(EVENT_NAME, onEvent as EventListener);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(EVENT_NAME, onEvent as EventListener);
    window.removeEventListener("storage", onStorage);
  };
}
