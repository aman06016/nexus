"use client";

import { getOrCreateSessionId } from "@/lib/session/session";

export type TeamReactionType = "watch" | "debunk" | "escalate";

type TeamReactionRecord = {
  id: string;
  scopeId: string;
  articleId: string;
  articleTitle: string;
  reaction: TeamReactionType;
  sessionId: string;
  at: number;
};

export type StoryPulse = {
  watchCount: number;
  debunkCount: number;
  escalateCount: number;
  score: number;
  heat: "cold" | "warm" | "hot";
  shift: "up" | "down" | "flat";
};

export type TeamWatchlistEntry = {
  articleId: string;
  articleTitle: string;
  watchCount: number;
  debunkCount: number;
  escalateCount: number;
  score: number;
  shift: "up" | "down" | "flat";
  lastActivityAt: number;
};

const STORAGE_KEY = "nexus:team-pulse:reactions";
const EVENT_NAME = "nexus:team-pulse:update";
const MAX_RECORDS = 4000;
const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const SHIFT_WINDOW_MS = 6 * 60 * 60 * 1000;

function safeRead(): TeamReactionRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as TeamReactionRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    const now = Date.now();
    return parsed
      .filter((item) => item && typeof item.articleId === "string" && typeof item.scopeId === "string")
      .filter((item) => now - item.at <= RETENTION_MS)
      .slice(-MAX_RECORDS);
  } catch {
    return [];
  }
}

function safeWrite(records: TeamReactionRecord[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-MAX_RECORDS)));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

function reactionScore(record: TeamReactionRecord): number {
  if (record.reaction === "watch") {
    return 1;
  }
  if (record.reaction === "escalate") {
    return 2.3;
  }
  return -1.6;
}

function weightedScore(records: TeamReactionRecord[], now = Date.now()): number {
  return records.reduce((sum, record) => {
    const ageHours = (now - record.at) / (60 * 60 * 1000);
    const decay = Math.max(0.3, 1 - ageHours / (24 * 5));
    return sum + reactionScore(record) * decay;
  }, 0);
}

function scoreToHeat(score: number, volume: number): StoryPulse["heat"] {
  if (score >= 7 || volume >= 8) {
    return "hot";
  }
  if (score >= 2 || volume >= 3) {
    return "warm";
  }
  return "cold";
}

function scoreShift(records: TeamReactionRecord[], now = Date.now()): StoryPulse["shift"] {
  const recent = records.filter((record) => now - record.at <= SHIFT_WINDOW_MS);
  const previous = records.filter(
    (record) => now - record.at > SHIFT_WINDOW_MS && now - record.at <= SHIFT_WINDOW_MS * 2
  );
  const recentScore = weightedScore(recent, now);
  const previousScore = weightedScore(previous, now);
  const delta = recentScore - previousScore;
  if (delta >= 1.2) {
    return "up";
  }
  if (delta <= -1.2) {
    return "down";
  }
  return "flat";
}

function byStory(records: TeamReactionRecord[], scopeId: string, articleId: string): TeamReactionRecord[] {
  return records.filter((record) => record.scopeId === scopeId && record.articleId === articleId);
}

export function getStoryPulse(scopeId: string, articleId: string): StoryPulse {
  const records = byStory(safeRead(), scopeId, articleId);
  const watchCount = records.filter((record) => record.reaction === "watch").length;
  const debunkCount = records.filter((record) => record.reaction === "debunk").length;
  const escalateCount = records.filter((record) => record.reaction === "escalate").length;
  const score = weightedScore(records);
  return {
    watchCount,
    debunkCount,
    escalateCount,
    score,
    heat: scoreToHeat(score, records.length),
    shift: scoreShift(records)
  };
}

export function hasMyReaction(scopeId: string, articleId: string, reaction: TeamReactionType): boolean {
  const sessionId = getOrCreateSessionId();
  return safeRead().some(
    (record) =>
      record.scopeId === scopeId &&
      record.articleId === articleId &&
      record.reaction === reaction &&
      record.sessionId === sessionId
  );
}

export function toggleReaction(scopeId: string, articleId: string, articleTitle: string, reaction: TeamReactionType): boolean {
  const sessionId = getOrCreateSessionId();
  const records = safeRead();
  const index = records.findIndex(
    (record) =>
      record.scopeId === scopeId &&
      record.articleId === articleId &&
      record.reaction === reaction &&
      record.sessionId === sessionId
  );

  if (index >= 0) {
    records.splice(index, 1);
    safeWrite(records);
    return false;
  }

  records.push({
    id: `pulse_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`,
    scopeId,
    articleId,
    articleTitle: articleTitle.trim() || "Untitled story",
    reaction,
    sessionId,
    at: Date.now()
  });
  safeWrite(records);
  return true;
}

export function getTeamWatchlist(scopeId: string, limit = 10): TeamWatchlistEntry[] {
  const records = safeRead().filter((record) => record.scopeId === scopeId);
  const byArticle = new Map<string, TeamReactionRecord[]>();
  for (const record of records) {
    const list = byArticle.get(record.articleId) ?? [];
    list.push(record);
    byArticle.set(record.articleId, list);
  }

  const entries: TeamWatchlistEntry[] = [];
  for (const [articleId, list] of byArticle.entries()) {
    const watchCount = list.filter((record) => record.reaction === "watch").length;
    const debunkCount = list.filter((record) => record.reaction === "debunk").length;
    const escalateCount = list.filter((record) => record.reaction === "escalate").length;
    const score = weightedScore(list);
    const lastActivityAt = Math.max(...list.map((record) => record.at));
    const articleTitle = list[0]?.articleTitle || articleId;
    if (watchCount + escalateCount + debunkCount === 0) {
      continue;
    }
    entries.push({
      articleId,
      articleTitle,
      watchCount,
      debunkCount,
      escalateCount,
      score,
      shift: scoreShift(list),
      lastActivityAt
    });
  }

  return entries
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit));
}

export function subscribeTeamPulse(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onCustom = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener(EVENT_NAME, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

