const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC"
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC"
});

function toDate(value: string | number | Date): Date | null {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatUtcDate(value?: string | number | Date | null, fallback = "Date unknown"): string {
  if (!value) {
    return fallback;
  }

  const parsed = toDate(value);
  if (!parsed) {
    return fallback;
  }

  return DATE_FORMATTER.format(parsed);
}

export function formatUtcDateTime(value?: string | number | Date | null, fallback = "Never"): string {
  if (!value) {
    return fallback;
  }

  const parsed = toDate(value);
  if (!parsed) {
    return fallback;
  }

  return DATE_TIME_FORMATTER.format(parsed);
}

export function formatRelativeTime(value?: string | number | Date | null, fallback = "just now"): string {
  if (!value) {
    return fallback;
  }

  const parsed = toDate(value);
  if (!parsed) {
    return fallback;
  }

  const diffMs = Date.now() - parsed.getTime();
  if (diffMs <= 10_000) {
    return "just now";
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
