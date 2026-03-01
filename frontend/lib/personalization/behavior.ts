import { Article } from "@/lib/api/client";

export type BehaviorAction = "read" | "like" | "save" | "skip";
export type SignalNodeType = "source" | "category" | "topic" | "article";

type BehaviorEvent = {
  articleId: string;
  title: string;
  source: string;
  category: string;
  topics: string[];
  action: BehaviorAction;
  at: number;
};

type SignalNode = {
  id: string;
  type: SignalNodeType;
  label: string;
  weight: number;
  lastSeenAt: number;
};

type SignalEdge = {
  from: string;
  to: string;
  weight: number;
};

export type SignalGraphSnapshot = {
  generatedAt: number;
  nodeCount: number;
  edgeCount: number;
  topTopics: string[];
  topSources: string[];
  topCategories: string[];
  nodes: SignalNode[];
  edges: SignalEdge[];
};

export type BehaviorSummary = {
  interactions: number;
  topSources: string[];
  topCategories: string[];
  topTopics: string[];
  confidence: "learning" | "adapting" | "strong";
  graphDensity: number;
};

export type ArticleRankingReason = {
  text: string;
  score: number;
  graphScore: number;
};

const EVENTS_KEY = "nexus:behavior-events";
const UPDATE_EVENT = "nexus:behavior-update";
const MAX_EVENTS = 400;
const MAX_TOPICS_PER_EVENT = 5;

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
  "will",
  "after",
  "before",
  "over",
  "under",
  "between",
  "during",
  "into",
  "onto",
  "their",
  "they",
  "them",
  "into",
  "you",
  "your",
  "is",
  "are",
  "was",
  "were",
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

const ACTION_WEIGHTS: Record<BehaviorAction, number> = {
  read: 1.1,
  like: 2.2,
  save: 3.2,
  skip: -1.8
};

function normalizeToken(value?: string | null): string {
  return value?.trim().toLowerCase() || "unknown";
}

function titleCase(value: string): string {
  return value
    .split(/[\s\-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseEvents(raw: string | null): BehaviorEvent[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as BehaviorEvent[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        item &&
        typeof item.articleId === "string" &&
        typeof item.title === "string" &&
        typeof item.source === "string" &&
        typeof item.category === "string" &&
        Array.isArray(item.topics) &&
        (item.action === "read" || item.action === "like" || item.action === "save" || item.action === "skip") &&
        typeof item.at === "number"
    );
  } catch {
    return [];
  }
}

function readEvents(): BehaviorEvent[] {
  if (typeof window === "undefined") {
    return [];
  }
  return parseEvents(window.localStorage.getItem(EVENTS_KEY));
}

function persistEvents(events: BehaviorEvent[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

function eventWeight(event: BehaviorEvent, now = Date.now()): number {
  const ageHours = Math.max(0, (now - event.at) / (1000 * 60 * 60));
  const decay = Math.max(0.3, 1 - ageHours / (24 * 21));
  return ACTION_WEIGHTS[event.action] * decay;
}

function extractTopics(article: Article): string[] {
  const text = `${article.title} ${article.summary ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

  const counts = new Map<string, number>();
  for (const word of text.split(" ")) {
    if (word.length < 4 || STOP_WORDS.has(word)) {
      continue;
    }
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TOPICS_PER_EVENT)
    .map(([word]) => word);
}

function nodeKey(type: SignalNodeType, value: string): string {
  return `${type}:${value}`;
}

function addNode(
  nodes: Map<string, SignalNode>,
  type: SignalNodeType,
  value: string,
  weight: number,
  at: number
) {
  const normalizedValue = normalizeToken(value);
  const key = nodeKey(type, normalizedValue);
  const existing = nodes.get(key);
  const label =
    type === "article"
      ? value.trim() || "Untitled article"
      : type === "source"
        ? value.trim() || "Unknown source"
        : titleCase(normalizedValue);

  if (existing) {
    existing.weight += weight;
    existing.lastSeenAt = Math.max(existing.lastSeenAt, at);
    return;
  }

  nodes.set(key, {
    id: key,
    type,
    label,
    weight,
    lastSeenAt: at
  });
}

function addEdge(edges: Map<string, SignalEdge>, from: string, to: string, weight: number) {
  const key = `${from}=>${to}`;
  const existing = edges.get(key);
  if (existing) {
    existing.weight += weight;
    return;
  }
  edges.set(key, { from, to, weight });
}

function buildSignalGraph(events: BehaviorEvent[]): SignalGraphSnapshot {
  const nodes = new Map<string, SignalNode>();
  const edges = new Map<string, SignalEdge>();
  const now = Date.now();
  const userNodeKey = "user:self";
  nodes.set(userNodeKey, {
    id: userNodeKey,
    type: "article",
    label: "You",
    weight: events.length,
    lastSeenAt: now
  });

  for (const event of events) {
    const weight = eventWeight(event, now);
    const sourceKey = nodeKey("source", event.source);
    const categoryKey = nodeKey("category", event.category);
    const articleKey = nodeKey("article", event.articleId);

    addNode(nodes, "source", event.source, weight * 1.6, event.at);
    addNode(nodes, "category", event.category, weight * 1.3, event.at);
    addNode(nodes, "article", event.title || event.articleId, weight * 0.9, event.at);

    addEdge(edges, userNodeKey, sourceKey, weight * 1.15);
    addEdge(edges, userNodeKey, categoryKey, weight * 1.05);
    addEdge(edges, userNodeKey, articleKey, weight * 0.7);
    addEdge(edges, sourceKey, categoryKey, weight * 0.45);
    addEdge(edges, categoryKey, sourceKey, weight * 0.35);

    for (const topic of event.topics) {
      const topicKey = nodeKey("topic", topic);
      addNode(nodes, "topic", topic, weight * 1.2, event.at);
      addEdge(edges, userNodeKey, topicKey, weight * 1.1);
      addEdge(edges, sourceKey, topicKey, weight * 0.7);
      addEdge(edges, categoryKey, topicKey, weight * 0.8);
      addEdge(edges, topicKey, articleKey, weight * 0.4);
    }
  }

  const rankedNodes = [...nodes.values()]
    .filter((node) => node.id !== userNodeKey)
    .sort((a, b) => b.weight - a.weight);
  const rankedEdges = [...edges.values()].sort((a, b) => b.weight - a.weight);

  const topByType = (type: SignalNodeType, limit: number) =>
    rankedNodes
      .filter((node) => node.type === type)
      .slice(0, limit)
      .map((node) => node.label);

  return {
    generatedAt: now,
    nodeCount: rankedNodes.length,
    edgeCount: rankedEdges.length,
    topTopics: topByType("topic", 4),
    topSources: topByType("source", 3),
    topCategories: topByType("category", 3),
    nodes: rankedNodes.slice(0, 28),
    edges: rankedEdges.slice(0, 36)
  };
}

function getNodeWeightMap(graph: SignalGraphSnapshot): Map<string, number> {
  const map = new Map<string, number>();
  for (const node of graph.nodes) {
    map.set(node.id, node.weight);
  }
  return map;
}

function articleRecencyBoost(article: Article): number {
  if (!article.publishedAt) {
    return 0;
  }
  const timestamp = new Date(article.publishedAt).getTime();
  if (!Number.isFinite(timestamp)) {
    return 0;
  }
  const hours = Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60));
  return Math.max(0, 12 - hours / 2);
}

type ArticleScoreBreakdown = {
  sourceLabel: string;
  categoryLabel: string;
  sourceScore: number;
  categoryScore: number;
  topicScore: number;
  articleScore: number;
  impactScore: number;
  recencyScore: number;
  totalScore: number;
};

export function trackBehaviorSignal(article: Article, action: BehaviorAction) {
  if (typeof window === "undefined" || !article.id) {
    return;
  }

  const source = normalizeToken(article.source?.domain || article.source?.name);
  const category = normalizeToken(article.category);
  const title = article.title?.trim() || article.id;
  const topics = extractTopics(article);

  const events = readEvents();
  events.push({
    articleId: article.id,
    title,
    source,
    category,
    topics,
    action,
    at: Date.now()
  });

  persistEvents(events);
}

export function clearBehaviorProfile() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(EVENTS_KEY);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

export function subscribeBehaviorUpdates(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onUpdate = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (event.key === EVENTS_KEY) {
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

export function getSignalGraphSnapshot(): SignalGraphSnapshot {
  return buildSignalGraph(readEvents());
}

export function getBehaviorSummary(): BehaviorSummary {
  const events = readEvents();
  const graph = buildSignalGraph(events);
  const interactions = events.length;
  const confidence =
    interactions >= 18 ? "strong" : interactions >= 7 ? "adapting" : "learning";
  const maxNodeLinks = Math.max(1, graph.nodeCount * 2);
  const graphDensity = Math.min(1, graph.edgeCount / maxNodeLinks);

  return {
    interactions,
    topSources: graph.topSources.slice(0, 2),
    topCategories: graph.topCategories.slice(0, 2),
    topTopics: graph.topTopics.slice(0, 3),
    confidence,
    graphDensity
  };
}

function scoreArticle(article: Article, graph: SignalGraphSnapshot): ArticleScoreBreakdown {
  const nodeWeights = getNodeWeightMap(graph);
  const source = normalizeToken(article.source?.domain || article.source?.name);
  const category = normalizeToken(article.category);
  const topics = extractTopics(article);
  const sourceScore = (nodeWeights.get(nodeKey("source", source)) ?? 0) * 5.5;
  const categoryScore = (nodeWeights.get(nodeKey("category", category)) ?? 0) * 4.8;
  const topicScore =
    topics.reduce((sum, topic) => sum + (nodeWeights.get(nodeKey("topic", topic)) ?? 0), 0) * 2.7;
  const articleScore = (nodeWeights.get(nodeKey("article", article.id)) ?? 0) * 1.8;
  const impactScore = article.impactScore ?? 0;
  const recencyScore = articleRecencyBoost(article);
  const totalScore = impactScore + sourceScore + categoryScore + topicScore + articleScore + recencyScore;
  return {
    sourceLabel: source,
    categoryLabel: category,
    sourceScore,
    categoryScore,
    topicScore,
    articleScore,
    impactScore,
    recencyScore,
    totalScore
  };
}

function buildRankingReason(article: Article, breakdown: ArticleScoreBreakdown): string {
  const graphParts: Array<{ label: string; score: number }> = [
    {
      label: `source affinity (${breakdown.sourceLabel})`,
      score: breakdown.sourceScore
    },
    {
      label: `category match (${breakdown.categoryLabel})`,
      score: breakdown.categoryScore
    },
    {
      label: "topic graph match",
      score: breakdown.topicScore
    },
    {
      label: "prior article interaction",
      score: breakdown.articleScore
    }
  ].filter((part) => part.score > 0.35);

  graphParts.sort((a, b) => b.score - a.score);
  const topGraph = graphParts.slice(0, 2).map((part) => part.label);

  if (topGraph.length === 0) {
    if (breakdown.recencyScore > 4) {
      return "Ranked for strong impact and freshness.";
    }
    return "Ranked for strong impact in the current feed.";
  }

  if (breakdown.recencyScore > 4) {
    return `Ranked higher due to ${topGraph.join(" and ")}, plus freshness.`;
  }

  if (breakdown.impactScore >= 70) {
    return `Ranked higher due to ${topGraph.join(" and ")} on a high-impact story.`;
  }

  return `Ranked higher due to ${topGraph.join(" and ")}.`;
}

export function rankArticlesWithReasons(articles: Article[]): {
  ranked: Article[];
  reasons: Record<string, ArticleRankingReason>;
} {
  if (typeof window === "undefined" || articles.length <= 1) {
    return { ranked: articles, reasons: {} };
  }

  const graph = getSignalGraphSnapshot();
  const scored = articles.map((article) => {
    const breakdown = scoreArticle(article, graph);
    return {
      article,
      breakdown
    };
  });

  scored.sort((left, right) => {
    if (right.breakdown.totalScore !== left.breakdown.totalScore) {
      return right.breakdown.totalScore - left.breakdown.totalScore;
    }
    return (right.article.impactScore ?? 0) - (left.article.impactScore ?? 0);
  });

  const reasons: Record<string, ArticleRankingReason> = {};
  for (const item of scored) {
    if (!item.article.id) {
      continue;
    }
    const graphScore =
      item.breakdown.sourceScore +
      item.breakdown.categoryScore +
      item.breakdown.topicScore +
      item.breakdown.articleScore;
    reasons[item.article.id] = {
      text: buildRankingReason(item.article, item.breakdown),
      score: item.breakdown.totalScore,
      graphScore
    };
  }

  return {
    ranked: scored.map((item) => item.article),
    reasons
  };
}

export function rankArticlesByBehavior(articles: Article[]): Article[] {
  return rankArticlesWithReasons(articles).ranked;
}

export function getReadArticleIds(): Set<string> {
  const ids = new Set<string>();
  for (const event of readEvents()) {
    if (event.action === "read" || event.action === "like" || event.action === "save") {
      ids.add(event.articleId);
    }
  }
  return ids;
}

export function getSkippedArticleIds(): Set<string> {
  const ids = new Set<string>();
  for (const event of readEvents()) {
    if (event.action === "skip") {
      ids.add(event.articleId);
    }
  }
  return ids;
}
