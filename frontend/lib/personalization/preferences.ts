"use client";

export type DeliveryCadence = "realtime" | "hourly" | "daily";

export type UserPreferences = {
  topics: string[];
  companies: string[];
  riskDomains: string[];
  deliveryCadence: DeliveryCadence;
  completedAt: number;
};

const KEY = "nexus:user-preferences";
const UPDATE_EVENT = "nexus:user-preferences-update";

function normalizeList(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, all) => all.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index)
    .slice(0, 12);
}

export function parseCommaList(input: string): string[] {
  return normalizeList(input.split(","));
}

export function getUserPreferences(): UserPreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as UserPreferences;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      topics: normalizeList(parsed.topics ?? []),
      companies: normalizeList(parsed.companies ?? []),
      riskDomains: normalizeList(parsed.riskDomains ?? []),
      deliveryCadence:
        parsed.deliveryCadence === "realtime" || parsed.deliveryCadence === "hourly" || parsed.deliveryCadence === "daily"
          ? parsed.deliveryCadence
          : "daily",
      completedAt: Number(parsed.completedAt) || Date.now()
    };
  } catch {
    return null;
  }
}

export function saveUserPreferences(preferences: Omit<UserPreferences, "completedAt">) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: UserPreferences = {
    topics: normalizeList(preferences.topics),
    companies: normalizeList(preferences.companies),
    riskDomains: normalizeList(preferences.riskDomains),
    deliveryCadence: preferences.deliveryCadence,
    completedAt: Date.now()
  };

  window.localStorage.setItem(KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

export function subscribeUserPreferences(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onUpdate = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      listener();
    }
  };

  window.addEventListener(UPDATE_EVENT, onUpdate);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(UPDATE_EVENT, onUpdate);
    window.removeEventListener("storage", onStorage);
  };
}

