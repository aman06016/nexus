import { Article } from "@/lib/api/client";

export type ShockwaveSeverity = "moderate" | "high" | "severe";

export type ShockwaveAlert = {
  id: string;
  topic: string;
  severity: ShockwaveSeverity;
  velocityRatio: number;
  sourceCount: number;
  impactForecast: string;
  affectedEntities: string[];
  recommendedActions: string[];
  supportingArticleIds: string[];
  supportingTitles: string[];
  createdAt: string;
};

type TopicAggregate = {
  topic: string;
  count: number;
  sourceDomains: Set<string>;
  sourceNames: Set<string>;
  impacts: number[];
  entities: string[];
  articleIds: string[];
  titles: string[];
};

type VelocitySnapshot = {
  at: number;
  counts: Record<string, number>;
};

const ALERTS_KEY = "nexus:shockwave:alerts";
const SEEN_KEY = "nexus:shockwave:seen";
const HISTORY_KEY = "nexus:shockwave:history";
const UPDATE_EVENT = "nexus:shockwave:update";
const MAX_ALERT_HISTORY = 120;
const MAX_VELOCITY_HISTORY = 40;
const MAX_SEEN = 300;
const WINDOW_MS = 30 * 60 * 1000;
const SNAPSHOT_RETENTION_MS = 6 * 60 * 60 * 1000;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "that",
  "this",
  "have",
  "has",
  "will",
  "more",
  "than",
  "after",
  "before",
  "about",
  "into",
  "over",
  "under",
  "your",
  "their",
  "today",
  "breaking",
  "latest",
  "news",
  "report"
]);

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function emitUpdate() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

function extractTopics(article: Article): string[] {
  const text = `${article.title} ${article.summary ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

  const counts = new Map<string, number>();
  for (const word of text.split(" ")) {
    const token = normalizeToken(word);
    if (token.length < 5 || STOP_WORDS.has(token)) {
      continue;
    }
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([token]) => token);
}

function extractEntities(article: Article): string[] {
  const text = `${article.title} ${article.summary ?? ""}`;
  const matches = text.match(/\b(?:[A-Z][a-z]{2,}|[A-Z]{2,})\b/g) ?? [];
  const filtered = matches
    .map((value) => value.trim())
    .filter((value) => !STOP_WORDS.has(value.toLowerCase()));

  const unique: string[] = [];
  for (const token of filtered) {
    if (!unique.some((existing) => existing.toLowerCase() === token.toLowerCase())) {
      unique.push(token);
    }
  }

  if (article.source?.name) {
    const source = article.source.name.trim();
    if (source && !unique.some((item) => item.toLowerCase() === source.toLowerCase())) {
      unique.push(source);
    }
  }

  return unique.slice(0, 6);
}

function articleTimestamp(article: Article): number | null {
  if (!article.publishedAt) {
    return null;
  }
  const ts = Number(new Date(article.publishedAt));
  return Number.isFinite(ts) ? ts : null;
}

function getVelocityHistory(): VelocitySnapshot[] {
  const history = safeGet<VelocitySnapshot[]>(HISTORY_KEY, []);
  if (!Array.isArray(history)) {
    return [];
  }
  return history.filter((entry) => typeof entry?.at === "number" && entry?.counts && typeof entry.counts === "object");
}

function appendVelocitySnapshot(snapshot: VelocitySnapshot) {
  const now = Date.now();
  const history = getVelocityHistory()
    .filter((entry) => now - entry.at <= SNAPSHOT_RETENTION_MS)
    .slice(-(MAX_VELOCITY_HISTORY - 1));
  history.push(snapshot);
  safeSet(HISTORY_KEY, history);
}

function getTopicBaseline(topic: string, history: VelocitySnapshot[]): number {
  const previousCounts = history
    .map((entry) => entry.counts[topic] ?? 0)
    .filter((count) => count > 0);

  if (previousCounts.length === 0) {
    return 0.5;
  }

  const avg = previousCounts.reduce((sum, value) => sum + value, 0) / previousCounts.length;
  return Math.max(0.5, avg);
}

function toTitle(token: string): string {
  return token
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function severityFromScore(score: number): ShockwaveSeverity {
  if (score >= 88) {
    return "severe";
  }
  if (score >= 68) {
    return "high";
  }
  return "moderate";
}

function forecastText(severity: ShockwaveSeverity, avgImpact: number, sourceCount: number): string {
  if (severity === "severe") {
    return `Severe escalation likely in next 2-6h. Estimated impact ${Math.round(avgImpact)} with ${sourceCount} independent sources confirming momentum.`;
  }
  if (severity === "high") {
    return `High probability of sustained movement over next 6-12h. Estimated impact ${Math.round(avgImpact)} with broad source confirmation.`;
  }
  return `Moderate signal acceleration detected. Monitor over next 12-24h for confirmation or decay.`;
}

function buildActions(topic: string, entities: string[], severity: ShockwaveSeverity): string[] {
  const impacted = entities.slice(0, 2).join(", ") || "key operators";
  const threshold = severity === "severe" ? 55 : severity === "high" ? 65 : 75;
  return [
    `Create an incident rule: topic includes "${topic}" and impact >= ${threshold}.`,
    `Add ${impacted} to your watched entities for direct notifications.`,
    "Pin top confirming stories in Saved and assign a 30-minute follow-up review."
  ];
}

export function detectShockwaves(articles: Article[]): ShockwaveAlert[] {
  const now = Date.now();
  const aggregates = new Map<string, TopicAggregate>();

  for (const article of articles) {
    if (!article.id) {
      continue;
    }

    const publishedAt = articleTimestamp(article);
    if (!publishedAt || now - publishedAt > WINDOW_MS) {
      continue;
    }

    const sourceDomain = article.source?.domain?.trim() || article.source?.name?.trim() || "unknown";
    const topics = extractTopics(article);
    const entities = extractEntities(article);

    for (const topic of topics) {
      const key = normalizeToken(topic);
      const current = aggregates.get(key) ?? {
        topic: key,
        count: 0,
        sourceDomains: new Set<string>(),
        sourceNames: new Set<string>(),
        impacts: [],
        entities: [],
        articleIds: [],
        titles: []
      };

      current.count += 1;
      current.sourceDomains.add(sourceDomain.toLowerCase());
      if (article.source?.name) {
        current.sourceNames.add(article.source.name);
      }
      current.impacts.push(article.impactScore ?? 0);
      current.articleIds.push(article.id);
      current.titles.push(article.title);
      for (const entity of entities) {
        if (!current.entities.some((existing) => existing.toLowerCase() === entity.toLowerCase())) {
          current.entities.push(entity);
        }
      }

      aggregates.set(key, current);
    }
  }

  const snapshotCounts: Record<string, number> = {};
  for (const [topic, aggregate] of aggregates.entries()) {
    snapshotCounts[topic] = aggregate.count;
  }

  const history = getVelocityHistory();
  appendVelocitySnapshot({ at: now, counts: snapshotCounts });

  const alerts: ShockwaveAlert[] = [];
  for (const aggregate of aggregates.values()) {
    if (aggregate.count < 3 || aggregate.sourceDomains.size < 2) {
      continue;
    }

    const baseline = getTopicBaseline(aggregate.topic, history);
    const velocityRatio = aggregate.count / baseline;
    if (velocityRatio < 2.2) {
      continue;
    }

    const avgImpact =
      aggregate.impacts.reduce((sum, value) => sum + value, 0) / Math.max(1, aggregate.impacts.length);
    const confidenceBonus = Math.min(24, aggregate.sourceDomains.size * 4 + velocityRatio * 3);
    const score = avgImpact * 0.65 + confidenceBonus;
    const severity = severityFromScore(score);
    const topicLabel = toTitle(aggregate.topic);
    alerts.push({
      id: newId("shockwave"),
      topic: topicLabel,
      severity,
      velocityRatio,
      sourceCount: aggregate.sourceDomains.size,
      impactForecast: forecastText(severity, avgImpact, aggregate.sourceDomains.size),
      affectedEntities: aggregate.entities.slice(0, 5),
      recommendedActions: buildActions(topicLabel, aggregate.entities, severity),
      supportingArticleIds: aggregate.articleIds.slice(0, 8),
      supportingTitles: aggregate.titles.slice(0, 3),
      createdAt: nowIso()
    });
  }

  return alerts.sort((a, b) => {
    if (b.velocityRatio !== a.velocityRatio) {
      return b.velocityRatio - a.velocityRatio;
    }
    return b.sourceCount - a.sourceCount;
  });
}

export function getShockwaveAlerts(limit = 20): ShockwaveAlert[] {
  const alerts = safeGet<ShockwaveAlert[]>(ALERTS_KEY, []);
  if (!Array.isArray(alerts)) {
    return [];
  }
  return alerts
    .filter((item) => item && typeof item.id === "string")
    .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
    .slice(0, Math.max(1, limit));
}

export function filterNewShockwaves(alerts: ShockwaveAlert[]): ShockwaveAlert[] {
  const seen = safeGet<Record<string, string>>(SEEN_KEY, {});
  const fresh: ShockwaveAlert[] = [];

  for (const alert of alerts) {
    const bucket = Math.floor(Number(new Date(alert.createdAt)) / (20 * 60 * 1000));
    const key = `${normalizeToken(alert.topic)}::${bucket}`;
    if (!seen[key]) {
      fresh.push(alert);
    }
  }

  return fresh;
}

export function markShockwavesSeen(alerts: ShockwaveAlert[]) {
  if (alerts.length === 0) {
    return;
  }

  const seen = safeGet<Record<string, string>>(SEEN_KEY, {});
  const now = nowIso();
  for (const alert of alerts) {
    const bucket = Math.floor(Number(new Date(alert.createdAt)) / (20 * 60 * 1000));
    const key = `${normalizeToken(alert.topic)}::${bucket}`;
    seen[key] = now;
  }
  const trimmed = Object.fromEntries(Object.entries(seen).slice(-MAX_SEEN));
  safeSet(SEEN_KEY, trimmed);
}

export function appendShockwaveAlerts(alerts: ShockwaveAlert[]) {
  if (alerts.length === 0) {
    return;
  }
  const existing = getShockwaveAlerts(MAX_ALERT_HISTORY);
  const combined = [...alerts, ...existing].slice(0, MAX_ALERT_HISTORY);
  safeSet(ALERTS_KEY, combined);
  emitUpdate();
}

export function subscribeShockwaveAlerts(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onUpdate = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (event.key === ALERTS_KEY || event.key === SEEN_KEY || event.key === HISTORY_KEY) {
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

