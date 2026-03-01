import { Article } from "@/lib/api/client";

export type QualityResult = {
  accepted: Article[];
  rejected: {
    stale: number;
    lowImpact: number;
    lowRelevance: number;
    invalidDate: number;
  };
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SEARCH_MAX_AGE_DAYS = 365;
const SEARCH_MIN_IMPACT = 1;
const DIGEST_MAX_AGE_DAYS = 3;
const DIGEST_MIN_IMPACT = 45;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "about",
  "have",
  "has",
  "are",
  "was",
  "were",
  "will",
  "you",
  "your",
  "their",
  "to",
  "in",
  "of",
  "on",
  "by",
  "at",
  "or",
  "an",
  "a"
]);

const EXPANSIONS: Record<string, string[]> = {
  agentic: ["agent", "automation", "assistant"],
  agents: ["agentic", "automation", "assistant"],
  model: ["llm", "release", "weights"],
  release: ["launch", "model", "capability"],
  safety: ["alignment", "risk", "governance"],
  policy: ["regulation", "compliance", "governance"],
  research: ["paper", "benchmark", "evaluation"]
};

function parsePublishedAt(article: Article): number | null {
  if (!article.publishedAt) {
    return null;
  }
  const timestamp = Number(new Date(article.publishedAt));
  return Number.isFinite(timestamp) ? timestamp : null;
}

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function searchRelevanceScore(article: Article, query: string): number {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return 1;
  }

  const searchable = `${article.title} ${article.summary ?? ""} ${article.category ?? ""} ${article.source?.name ?? ""} ${
    article.source?.domain ?? ""
  }`
    .toLowerCase()
    .replace(/\s+/g, " ");

  const title = (article.title ?? "").toLowerCase();
  const summary = (article.summary ?? "").toLowerCase();
  const category = (article.category ?? "").toLowerCase();
  const source = `${article.source?.name ?? ""} ${article.source?.domain ?? ""}`.toLowerCase();

  let score = searchable.includes(normalizedQuery) ? 8 : 0;
  for (const token of tokenizeQuery(normalizedQuery)) {
    if (title.includes(token)) {
      score += 4;
    } else if (summary.includes(token)) {
      score += 2;
    } else if (category.includes(token) || source.includes(token)) {
      score += 1;
    }

    for (const expanded of EXPANSIONS[token] ?? []) {
      if (title.includes(expanded)) {
        score += 2;
      } else if (summary.includes(expanded)) {
        score += 1;
      }
    }
  }
  return score;
}

function isFreshWithinDays(publishedAtMs: number, days: number): boolean {
  return Date.now() - publishedAtMs <= days * MS_PER_DAY;
}

export function filterSearchQuality(articles: Article[], query: string): QualityResult {
  const rejected = { stale: 0, lowImpact: 0, lowRelevance: 0, invalidDate: 0 };
  const accepted: Array<{ article: Article; rankingScore: number }> = [];

  for (const article of articles) {
    const publishedAt = parsePublishedAt(article);
    if (!publishedAt) {
      rejected.invalidDate += 1;
      continue;
    }

    if (!isFreshWithinDays(publishedAt, SEARCH_MAX_AGE_DAYS)) {
      rejected.stale += 1;
      continue;
    }

    if ((article.impactScore ?? 0) < SEARCH_MIN_IMPACT) {
      rejected.lowImpact += 1;
      continue;
    }

    const relevanceScore = searchRelevanceScore(article, query);
    const ageDays = Math.max(0, (Date.now() - publishedAt) / MS_PER_DAY);
    const recencyScore = Math.max(0, 20 - ageDays / 8);
    const impactScore = Math.max(0, article.impactScore ?? 0);
    const rankingScore = relevanceScore * 2.3 + recencyScore + impactScore * 0.35;

    if (relevanceScore < 4 || rankingScore < 12) {
      rejected.lowRelevance += 1;
      continue;
    }

    accepted.push({ article, rankingScore });
  }

  accepted.sort((left, right) => right.rankingScore - left.rankingScore);
  return { accepted: accepted.map((item) => item.article), rejected };
}

export function filterDigestQuality(articles: Article[]): QualityResult {
  const rejected = { stale: 0, lowImpact: 0, lowRelevance: 0, invalidDate: 0 };
  const accepted: Article[] = [];

  for (const article of articles) {
    const publishedAt = parsePublishedAt(article);
    if (!publishedAt) {
      rejected.invalidDate += 1;
      continue;
    }

    if (!isFreshWithinDays(publishedAt, DIGEST_MAX_AGE_DAYS)) {
      rejected.stale += 1;
      continue;
    }

    if ((article.impactScore ?? 0) < DIGEST_MIN_IMPACT) {
      rejected.lowImpact += 1;
      continue;
    }

    accepted.push(article);
  }

  return { accepted, rejected };
}
