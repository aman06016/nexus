import { Article } from "@/lib/api/client";

type TrendReason = {
  articleId: string;
  title: string;
  href: string;
  reason: string;
  score: number;
};

type DiscoveryInsights = {
  summary: string;
  bullets: string[];
  trendReasons: TrendReason[];
  suggestions: string[];
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "into",
  "about",
  "your",
  "our",
  "their",
  "have",
  "has",
  "are",
  "was",
  "were",
  "will",
  "after",
  "before",
  "across",
  "what",
  "when",
  "where",
  "why",
  "you",
  "its",
  "it",
  "to",
  "in",
  "of",
  "on",
  "by",
  "at",
  "as",
  "or",
  "an",
  "a",
  "is"
]);

const EXPANSIONS: Record<string, string[]> = {
  agent: ["automation", "tooling"],
  agents: ["automation", "multi-agent"],
  security: ["risk", "defense"],
  policy: ["governance", "regulation"],
  model: ["benchmark", "capabilities"],
  release: ["launch", "changelog"],
  safety: ["alignment", "evaluation"],
  research: ["paper", "analysis"]
};

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(" ")
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
}

function topEntries(map: Map<string, number>, limit: number): Array<[string, number]> {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function recencyBoost(article: Article, latestPublishedAtMs: number): number {
  const publishedAtMs = article.publishedAt ? new Date(article.publishedAt).getTime() : Number.NaN;
  if (!Number.isFinite(publishedAtMs)) {
    return 0;
  }
  const hourDiff = Math.max(0, (latestPublishedAtMs - publishedAtMs) / (1000 * 60 * 60));
  return Math.max(0, 18 - hourDiff);
}

function engagementScore(article: Article): number {
  const likes = article.stats?.likes ?? 0;
  const saves = article.stats?.saves ?? 0;
  const shares = article.stats?.shares ?? 0;
  const views = article.stats?.views ?? 0;
  return likes * 2 + saves * 3 + shares * 4 + Math.min(10, views / 20);
}

function buildReason(article: Article, impact: number, engagement: number, freshness: number): string {
  if (impact >= 70) {
    return `High impact (${impact}) in ${article.category ?? "General"} is driving ranking.`;
  }
  if (engagement >= 8) {
    return `Strong engagement signals (${Math.round(engagement)}) indicate active reader interest.`;
  }
  if (freshness >= 8) {
    return "Recent publication spike is lifting this story in the feed.";
  }
  return `Consistent score across impact, engagement, and freshness keeps this story visible.`;
}

function buildSuggestions(query: string, themes: string[], categories: string[], sources: string[]): string[] {
  const suggestions = new Set<string>();

  for (const theme of themes) {
    suggestions.add(`${theme} trends`);
    const expanded = EXPANSIONS[theme] ?? [];
    for (const term of expanded) {
      suggestions.add(`${theme} ${term}`);
    }
  }

  for (const category of categories) {
    if (themes[0]) {
      suggestions.add(`${themes[0]} ${category}`);
    } else {
      suggestions.add(`${category} updates`);
    }
  }

  for (const source of sources) {
    if (themes[0]) {
      suggestions.add(`${source} ${themes[0]}`);
    }
  }

  const normalizedQuery = normalizeText(query);
  if (normalizedQuery) {
    suggestions.add(`${normalizedQuery} analysis`);
    suggestions.add(`${normalizedQuery} outlook`);
    for (const token of tokenize(normalizedQuery)) {
      const expanded = EXPANSIONS[token] ?? [];
      for (const term of expanded) {
        suggestions.add(`${normalizedQuery} ${term}`);
      }
    }
  }

  return [...suggestions].slice(0, 8);
}

export function buildDiscoveryInsights(articles: Article[], query = "", scopeLabel = "this feed"): DiscoveryInsights {
  if (articles.length === 0) {
    return {
      summary: `NEXUS Copilot needs more stories to generate insights for ${scopeLabel}.`,
      bullets: ["Run a broader search or open Trending to seed analysis."],
      trendReasons: [],
      suggestions: query ? [`${query} trends`, `${query} overview`] : ["ai trends", "model release", "ai policy"]
    };
  }

  const tokenCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();

  for (const article of articles) {
    const composite = `${article.title} ${article.summary ?? ""}`;
    for (const token of tokenize(composite)) {
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    }
    const category = (article.category ?? "General").trim();
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    const source = (article.source?.name ?? "Unknown source").trim();
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  const topThemes = topEntries(tokenCounts, 3).map(([theme]) => theme);
  const topCategories = topEntries(categoryCounts, 2).map(([category]) => category);
  const topSources = topEntries(sourceCounts, 2).map(([source]) => source);

  const latestPublishedAtMs = Math.max(
    ...articles.map((article) => (article.publishedAt ? new Date(article.publishedAt).getTime() : 0)),
    0
  );

  const trendReasons = articles
    .map((article) => {
      const impact = article.impactScore ?? 0;
      const engagement = engagementScore(article);
      const freshness = recencyBoost(article, latestPublishedAtMs);
      const score = impact + engagement + freshness;
      return {
        articleId: article.id,
        title: article.title,
        href: article.url?.trim() ? article.url : `/search?q=${encodeURIComponent(article.title)}`,
        reason: buildReason(article, impact, engagement, freshness),
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const suggestions = buildSuggestions(query, topThemes, topCategories, topSources);
  const summary = `NEXUS Copilot sees ${topThemes.join(", ") || "broad AI topics"} leading ${scopeLabel}.`;
  const bullets = [
    topCategories.length > 0
      ? `Most frequent categories: ${topCategories.join(", ")}.`
      : "Category signal is mixed across stories.",
    topSources.length > 0
      ? `Primary source velocity from ${topSources.join(" and ")}.`
      : "Source velocity is evenly distributed.",
    trendReasons[0]
      ? `Top ranked signal: ${trendReasons[0].reason}`
      : "No dominant signal detected yet."
  ];

  return { summary, bullets, trendReasons, suggestions };
}
