import { Article } from "@/lib/api/client";

export type AlertDeliveryMode = "realtime" | "digest" | "both";

export type IncidentRule = {
  id: string;
  name: string;
  topic: string;
  company?: string;
  sourceDomain?: string;
  minImpact: number;
  mode: AlertDeliveryMode;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type IncidentAlertEvent = {
  id: string;
  ruleId: string;
  ruleName: string;
  articleId: string;
  articleTitle: string;
  articleUrl?: string;
  impactScore: number;
  sourceName: string;
  category: string;
  reasons: string[];
  createdAt: string;
};

export type RuleMatch = {
  rule: IncidentRule;
  article: Article;
  reasons: string[];
};

const RULES_KEY = "nexus:radar:rules";
const ALERTS_KEY = "nexus:radar:alerts";
const LAST_DIGEST_KEY = "nexus:radar:last-digest-at";
const SEEN_MATCHES_KEY = "nexus:radar:seen-matches";
const UPDATE_EVENT = "nexus:radar:update";
const MAX_ALERT_HISTORY = 220;
const MAX_SEEN_MATCHES = 800;
const DEFAULT_MIN_IMPACT = 65;

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function normalizeText(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeLocalStorageGet(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(key);
}

function safeLocalStorageSet(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, value);
}

function emitRadarUpdate() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

function readRulesUnsafe(): IncidentRule[] {
  const parsed = parseJson<IncidentRule[]>(safeLocalStorageGet(RULES_KEY), []);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((rule) => rule && typeof rule.id === "string")
    .map((rule) => ({
      ...rule,
      minImpact: Number.isFinite(rule.minImpact) ? rule.minImpact : DEFAULT_MIN_IMPACT,
      mode:
        rule.mode === "realtime" || rule.mode === "digest" || rule.mode === "both"
          ? rule.mode
          : "both",
      enabled: rule.enabled !== false
    }));
}

function writeRulesUnsafe(rules: IncidentRule[]) {
  safeLocalStorageSet(RULES_KEY, JSON.stringify(rules));
  emitRadarUpdate();
}

function readAlertsUnsafe(): IncidentAlertEvent[] {
  const parsed = parseJson<IncidentAlertEvent[]>(safeLocalStorageGet(ALERTS_KEY), []);
  return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string") : [];
}

function writeAlertsUnsafe(events: IncidentAlertEvent[]) {
  safeLocalStorageSet(ALERTS_KEY, JSON.stringify(events.slice(-MAX_ALERT_HISTORY)));
  emitRadarUpdate();
}

function readSeenMatchesUnsafe(): Record<string, string> {
  return parseJson<Record<string, string>>(safeLocalStorageGet(SEEN_MATCHES_KEY), {});
}

function writeSeenMatchesUnsafe(seen: Record<string, string>) {
  const entries = Object.entries(seen).slice(-MAX_SEEN_MATCHES);
  safeLocalStorageSet(SEEN_MATCHES_KEY, JSON.stringify(Object.fromEntries(entries)));
}

export function getIncidentRules(): IncidentRule[] {
  return readRulesUnsafe().sort((a, b) => Number(new Date(b.updatedAt)) - Number(new Date(a.updatedAt)));
}

export function createIncidentRule(input: {
  name: string;
  topic: string;
  company?: string;
  sourceDomain?: string;
  minImpact?: number;
  mode?: AlertDeliveryMode;
}): IncidentRule {
  const now = nowIso();
  const rule: IncidentRule = {
    id: newId("rule"),
    name: input.name.trim() || `Rule ${new Date().toLocaleTimeString()}`,
    topic: input.topic.trim(),
    company: input.company?.trim() || undefined,
    sourceDomain: input.sourceDomain?.trim() || undefined,
    minImpact: Math.max(0, Math.min(100, Math.round(input.minImpact ?? DEFAULT_MIN_IMPACT))),
    mode: input.mode ?? "both",
    enabled: true,
    createdAt: now,
    updatedAt: now
  };

  const rules = readRulesUnsafe();
  rules.push(rule);
  writeRulesUnsafe(rules);
  return rule;
}

export function updateIncidentRule(
  ruleId: string,
  updates: Partial<Omit<IncidentRule, "id" | "createdAt">>
): IncidentRule | null {
  const rules = readRulesUnsafe();
  const index = rules.findIndex((rule) => rule.id === ruleId);
  if (index < 0) {
    return null;
  }

  const current = rules[index];
  const next: IncidentRule = {
    ...current,
    ...updates,
    name: updates.name !== undefined ? updates.name.trim() : current.name,
    topic: updates.topic !== undefined ? updates.topic.trim() : current.topic,
    company: updates.company !== undefined ? updates.company.trim() || undefined : current.company,
    sourceDomain:
      updates.sourceDomain !== undefined ? updates.sourceDomain.trim() || undefined : current.sourceDomain,
    minImpact:
      updates.minImpact !== undefined
        ? Math.max(0, Math.min(100, Math.round(updates.minImpact)))
        : current.minImpact,
    mode: updates.mode ?? current.mode,
    updatedAt: nowIso()
  };

  rules[index] = next;
  writeRulesUnsafe(rules);
  return next;
}

export function toggleIncidentRule(ruleId: string, enabled: boolean): IncidentRule | null {
  return updateIncidentRule(ruleId, { enabled });
}

export function deleteIncidentRule(ruleId: string): void {
  const rules = readRulesUnsafe().filter((rule) => rule.id !== ruleId);
  writeRulesUnsafe(rules);
}

function includesPattern(text: string, pattern: string): boolean {
  const normalizedText = normalizeText(text);
  const normalizedPattern = normalizeText(pattern);
  return normalizedPattern ? normalizedText.includes(normalizedPattern) : false;
}

export function matchesIncidentRule(rule: IncidentRule, article: Article): RuleMatch | null {
  if (!rule.enabled || !article.id) {
    return null;
  }

  const reasons: string[] = [];
  const impactScore = article.impactScore ?? 0;
  if (impactScore < rule.minImpact) {
    return null;
  }
  reasons.push(`impact ${impactScore} >= ${rule.minImpact}`);

  const sourceName = article.source?.name ?? "";
  const sourceDomain = article.source?.domain ?? "";
  const category = article.category ?? "";
  const title = article.title ?? "";
  const summary = article.summary ?? "";
  const searchable = `${title} ${summary} ${category} ${sourceName} ${sourceDomain}`;

  if (!includesPattern(searchable, rule.topic)) {
    return null;
  }
  reasons.push(`topic "${rule.topic}" match`);

  if (rule.company) {
    if (!includesPattern(searchable, rule.company)) {
      return null;
    }
    reasons.push(`company "${rule.company}" match`);
  }

  if (rule.sourceDomain) {
    if (!includesPattern(sourceDomain, rule.sourceDomain)) {
      return null;
    }
    reasons.push(`source "${rule.sourceDomain}" match`);
  }

  return { rule, article, reasons };
}

export function evaluateIncidentRules(
  rules: IncidentRule[],
  articles: Article[]
): RuleMatch[] {
  const matches: RuleMatch[] = [];
  for (const rule of rules) {
    for (const article of articles) {
      const match = matchesIncidentRule(rule, article);
      if (match) {
        matches.push(match);
      }
    }
  }
  return matches;
}

function matchKey(ruleId: string, articleId: string): string {
  return `${ruleId}::${articleId}`;
}

export function filterNewIncidentMatches(matches: RuleMatch[]): RuleMatch[] {
  const seen = readSeenMatchesUnsafe();
  const fresh: RuleMatch[] = [];

  for (const match of matches) {
    const key = matchKey(match.rule.id, match.article.id);
    if (!seen[key]) {
      fresh.push(match);
    }
  }

  return fresh;
}

export function markIncidentMatchesSeen(matches: RuleMatch[]): void {
  if (matches.length === 0) {
    return;
  }

  const seen = readSeenMatchesUnsafe();
  const stamp = nowIso();
  for (const match of matches) {
    seen[matchKey(match.rule.id, match.article.id)] = stamp;
  }
  writeSeenMatchesUnsafe(seen);
}

export function appendIncidentAlerts(matches: RuleMatch[]): IncidentAlertEvent[] {
  if (matches.length === 0) {
    return [];
  }

  const events = matches.map((match) => ({
    id: newId("alert"),
    ruleId: match.rule.id,
    ruleName: match.rule.name,
    articleId: match.article.id,
    articleTitle: match.article.title,
    articleUrl: match.article.url,
    impactScore: match.article.impactScore ?? 0,
    sourceName: match.article.source?.name ?? "Unknown source",
    category: match.article.category ?? "General",
    reasons: match.reasons,
    createdAt: nowIso()
  }));

  const merged = [...readAlertsUnsafe(), ...events];
  writeAlertsUnsafe(merged);
  return events;
}

export function getIncidentAlertEvents(limit = 80): IncidentAlertEvent[] {
  return readAlertsUnsafe()
    .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
    .slice(0, limit);
}

export function getLastDigestAt(): string | null {
  return safeLocalStorageGet(LAST_DIGEST_KEY);
}

export function setLastDigestAt(isoTimestamp: string): void {
  safeLocalStorageSet(LAST_DIGEST_KEY, isoTimestamp);
  emitRadarUpdate();
}

export function getIncidentRuleTemplates(): Array<{
  name: string;
  topic: string;
  company?: string;
  minImpact: number;
  mode: AlertDeliveryMode;
}> {
  return [
    {
      name: "Cybersecurity escalation",
      topic: "cybersecurity",
      minImpact: 65,
      mode: "both"
    },
    {
      name: "Model release watch",
      topic: "model release",
      minImpact: 60,
      mode: "realtime"
    },
    {
      name: "Regulation movement",
      topic: "policy",
      minImpact: 55,
      mode: "digest"
    }
  ];
}

export function subscribeIncidentRadar(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onUpdate = () => listener();
  const onStorage = (event: StorageEvent) => {
    if ([RULES_KEY, ALERTS_KEY, LAST_DIGEST_KEY, SEEN_MATCHES_KEY].includes(event.key ?? "")) {
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
