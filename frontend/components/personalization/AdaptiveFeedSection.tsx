"use client";

import { useEffect, useMemo, useState } from "react";
import { Article, fetchPersonalizedFeed } from "@/lib/api/client";
import { FeedGrid } from "@/features/feed/FeedGrid";
import { FeedSkeletonGrid } from "@/components/feed/FeedSkeletonGrid";
import { getOrCreateSessionId } from "@/lib/session/session";
import {
  clearBehaviorProfile,
  getBehaviorSummary,
  getSkippedArticleIds,
  getSignalGraphSnapshot,
  rankArticlesWithReasons,
  subscribeBehaviorUpdates
} from "@/lib/personalization/behavior";
import { SignalGraphPanel } from "@/components/personalization/SignalGraphPanel";
import { getSourceTrust } from "@/lib/trust/sourceTrust";
import { getUserPreferences, subscribeUserPreferences } from "@/lib/personalization/preferences";
import { getStreamHealthSnapshot, subscribeStreamHealth } from "@/lib/ws/streamHealth";
import { toUserSafeErrorMessage } from "@/lib/errors/userMessage";
import { formatUtcDateTime } from "@/lib/format/date";

type AdaptiveFeedSectionProps = {
  articles: Article[];
  includePersonalizedEndpoint?: boolean;
  strictQualityMode?: boolean;
};

type QualityFilters = {
  last24h: boolean;
  highImpact: boolean;
  primarySourcesOnly: boolean;
};

type AutopilotMode = "conservative" | "balanced" | "frontier";
const AUTOPILOT_MODE_KEY = "nexus:autopilot-mode";

type RankingComputation = {
  ranked: Article[];
  reasons: Record<string, { text: string; score: number; graphScore: number }>;
  failed: boolean;
};

function dedupeArticles(articles: Article[]): Article[] {
  const byId = new Map<string, Article>();
  for (const article of articles) {
    if (!article.id || byId.has(article.id)) {
      continue;
    }
    byId.set(article.id, article);
  }
  return [...byId.values()];
}

function isPrimaryQualityArticle(article: Article): boolean {
  if ((article.impactScore ?? 0) <= 0) {
    return false;
  }

  if (!article.publishedAt) {
    return false;
  }

  const publishedAt = new Date(article.publishedAt);
  if (Number.isNaN(publishedAt.getTime())) {
    return false;
  }

  return publishedAt.getUTCFullYear() >= 2022;
}

function isWithinLast24Hours(article: Article): boolean {
  if (!article.publishedAt) {
    return false;
  }
  const publishedAt = new Date(article.publishedAt);
  if (Number.isNaN(publishedAt.getTime())) {
    return false;
  }
  return Date.now() - publishedAt.getTime() <= 24 * 60 * 60 * 1000;
}

function hasHighImpact(article: Article): boolean {
  return (article.impactScore ?? 0) >= 60;
}

function isPrimarySource(article: Article): boolean {
  const sourceDomain = article.source?.domain?.trim();
  const trust = getSourceTrust(sourceDomain);
  return trust.tone === "high";
}

function preferenceBoost(article: Article, preferenceTerms: string[]): number {
  if (preferenceTerms.length === 0) {
    return 0;
  }

  const text = `${article.title} ${article.summary ?? ""} ${article.source?.name ?? ""} ${article.source?.domain ?? ""} ${article.category ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, " ");

  return preferenceTerms.reduce((score, term) => (text.includes(term) ? score + 1 : score), 0);
}

export function AdaptiveFeedSection({
  articles,
  includePersonalizedEndpoint = true,
  strictQualityMode = false
}: AdaptiveFeedSectionProps) {
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(true);
  const [loading, setLoading] = useState(includePersonalizedEndpoint);
  const [baseArticles, setBaseArticles] = useState<Article[]>(articles);
  const [refreshToken, setRefreshToken] = useState(0);
  const [summaryToken, setSummaryToken] = useState(0);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [ingestedCount, setIngestedCount] = useState(articles.length);
  const [filters, setFilters] = useState<QualityFilters>({
    last24h: true,
    highImpact: true,
    primarySourcesOnly: true
  });
  const [frozenArticles, setFrozenArticles] = useState<Article[] | null>(null);
  const [autopilotMode, setAutopilotMode] = useState<AutopilotMode>("balanced");
  const [statusMessage, setStatusMessage] = useState("");
  const [feedError, setFeedError] = useState<string | null>(null);
  const [lastKnownGoodAt, setLastKnownGoodAt] = useState<string | null>(null);
  const [isManualRefresh, setIsManualRefresh] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(AUTOPILOT_MODE_KEY);
    if (stored === "conservative" || stored === "balanced" || stored === "frontier") {
      setAutopilotMode(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(AUTOPILOT_MODE_KEY, autopilotMode);
  }, [autopilotMode]);

  const sourceArticles = useMemo(
    () => (strictQualityMode ? articles.filter(isPrimaryQualityArticle) : articles),
    [articles, strictQualityMode]
  );

  useEffect(() => {
    setBaseArticles(sourceArticles);
    setIngestedCount(sourceArticles.length);
  }, [sourceArticles]);

  useEffect(() => {
    if (!includePersonalizedEndpoint) {
      setLoading(false);
      return;
    }

    let canceled = false;
    const loadPersonalized = async () => {
      setLoading(true);
      setFeedError(null);
      try {
        const recommendations = await fetchPersonalizedFeed(getOrCreateSessionId(), 0, 20);
        const filteredRecommendations = strictQualityMode
          ? recommendations.filter(isPrimaryQualityArticle)
          : recommendations;
        const combined = [...filteredRecommendations, ...sourceArticles];
        const deduped = dedupeArticles(combined);

        if (!canceled) {
          setIngestedCount(combined.length);
          setBaseArticles(deduped.length > 0 ? deduped : sourceArticles);
          setLastKnownGoodAt(new Date().toISOString());
          setStatusMessage("Feed refreshed.");
        }
      } catch (error) {
        if (!canceled) {
          setFeedError(toUserSafeErrorMessage(error, "Feed refresh failed. Showing last known results."));
          setStatusMessage("Feed refresh failed. Using last known results.");
        }
      } finally {
        if (!canceled) {
          setLoading(false);
          setIsManualRefresh(false);
        }
      }
    };

    loadPersonalized();
    return () => {
      canceled = true;
    };
  }, [includePersonalizedEndpoint, refreshToken, sourceArticles, strictQualityMode]);

  useEffect(() => subscribeBehaviorUpdates(() => setSummaryToken((current) => current + 1)), []);
  useEffect(() => subscribeUserPreferences(() => setSummaryToken((current) => current + 1)), []);
  useEffect(() => subscribeStreamHealth(() => setSummaryToken((current) => current + 1)), []);

  const behaviorSummary = useMemo(() => getBehaviorSummary(), [summaryToken]);
  const signalGraphSnapshot = useMemo(() => getSignalGraphSnapshot(), [summaryToken]);
  const preferences = useMemo(() => getUserPreferences(), [summaryToken]);
  const streamHealth = useMemo(() => getStreamHealthSnapshot(), [summaryToken]);

  const filteredResult = useMemo(() => {
    let current = baseArticles;
    let filteredOld = 0;
    let filteredLowImpact = 0;
    let filteredLowTrust = 0;

    if (filters.last24h) {
      const next = current.filter(isWithinLast24Hours);
      filteredOld += current.length - next.length;
      current = next;
    }

    if (filters.highImpact) {
      const next = current.filter(hasHighImpact);
      filteredLowImpact += current.length - next.length;
      current = next;
    }

    if (filters.primarySourcesOnly) {
      const next = current.filter(isPrimarySource);
      filteredLowTrust += current.length - next.length;
      current = next;
    }

    return {
      articles: current,
      filteredOld,
      filteredLowImpact,
      filteredLowTrust
    };
  }, [baseArticles, filters]);

  const preferenceTerms = useMemo(() => {
    return [
      ...(preferences?.topics ?? []),
      ...(preferences?.companies ?? []),
      ...(preferences?.riskDomains ?? [])
    ].map((term) => term.toLowerCase());
  }, [preferences]);
  const skippedIds = useMemo(() => getSkippedArticleIds(), [summaryToken]);

  const rankingResult = useMemo<RankingComputation | null>(() => {
    if (!adaptiveEnabled) {
      return null;
    }

    try {
      const baseRanking = rankArticlesWithReasons(filteredResult.articles);
      const scored = baseRanking.ranked.map((article) => {
        const boost = preferenceBoost(article, preferenceTerms);
        const reasonScore = baseRanking.reasons[article.id]?.score ?? 0;
        return {
          article,
          boost,
          score: reasonScore + boost * 8
        };
      });

      scored.sort((left, right) => right.score - left.score);

      const reasons = { ...baseRanking.reasons };
      for (const item of scored) {
        if (!item.article.id) {
          continue;
        }
        if (item.boost > 0) {
          const currentReason = reasons[item.article.id]?.text ?? "Ranked by relevance.";
          reasons[item.article.id] = {
            text: `${currentReason} Preference match on ${item.boost} signal${item.boost === 1 ? "" : "s"}.`,
            score: item.score,
            graphScore: reasons[item.article.id]?.graphScore ?? 0
          };
        }
      }

      return {
        ranked: scored.map((item) => item.article),
        reasons,
        failed: false
      };
    } catch {
      return {
        ranked: filteredResult.articles,
        reasons: {},
        failed: true
      };
    }
  }, [adaptiveEnabled, filteredResult.articles, preferenceTerms, summaryToken]);

  const candidateArticles = rankingResult?.ranked ?? filteredResult.articles;

  useEffect(() => {
    if (streamHealth.isPaused && !frozenArticles) {
      setFrozenArticles(candidateArticles);
      return;
    }
    if (!streamHealth.isPaused && frozenArticles) {
      setFrozenArticles(null);
    }
  }, [streamHealth.isPaused, frozenArticles, candidateArticles]);

  const renderedArticles = streamHealth.isPaused && frozenArticles ? frozenArticles : candidateArticles;

  const rankingReasonTextMap = useMemo(
    () =>
      rankingResult
        ? Object.fromEntries(
            Object.entries(rankingResult.reasons).map(([articleId, reason]) => [articleId, reason.text])
          )
        : undefined,
    [rankingResult]
  );

  const duplicateSuppressed = Math.max(0, ingestedCount - baseArticles.length);
  const pauseText =
    streamHealth.isPaused && streamHealth.lastSuccessfulUpdateAt
      ? `Live paused · last successful update at ${new Date(streamHealth.lastSuccessfulUpdateAt).toLocaleTimeString("en-US", {
          hour12: false
        })}`
      : null;

  const autopilotQueue = useMemo(() => {
    const baseList = renderedArticles.filter((article) => !skippedIds.has(article.id));
    const config =
      autopilotMode === "conservative"
        ? { minImpact: 70, maxItems: 4, scoreFloor: 85 }
        : autopilotMode === "frontier"
          ? { minImpact: 35, maxItems: 10, scoreFloor: 30 }
          : { minImpact: 55, maxItems: 7, scoreFloor: 55 };

    const queue = baseList
      .map((article) => {
        const score = rankingResult?.reasons[article.id]?.score ?? (article.impactScore ?? 0);
        return { article, score };
      })
      .filter((item) => (item.article.impactScore ?? 0) >= config.minImpact && item.score >= config.scoreFloor)
      .sort((left, right) => right.score - left.score)
      .slice(0, config.maxItems);

    if (queue.length > 0) {
      return queue;
    }

    return baseList
      .map((article) => ({
        article,
        score: rankingResult?.reasons[article.id]?.score ?? (article.impactScore ?? 0)
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);
  }, [autopilotMode, renderedArticles, skippedIds, rankingResult]);

  return (
    <section className="space-y-4">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-display-title text-2xl">Adaptive Ranking</h2>
            <p className="mt-1 text-sm text-textSecondary">
              Learns from reads, likes, saves, source affinity, and your onboarding preferences.
            </p>
          </div>
          <span className="rounded-full border border-borderSoft bg-bgTertiary px-2.5 py-1 text-xs font-medium text-textSecondary">
            Profile: {behaviorSummary.confidence}
          </span>
        </div>

        {pauseText ? (
          <p className="mt-3 rounded-md border border-accentPrimary/40 bg-accentPrimary/10 px-3 py-2 text-xs text-accentPrimary">
            {pauseText}. Feed updates are temporarily frozen.
          </p>
        ) : null}
        {rankingResult?.failed ? (
          <div className="mt-3 rounded-md border border-accentDanger/50 bg-accentDanger/10 p-3 text-sm text-accentDanger">
            Ranking service degraded. Showing fallback feed order.
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-textSecondary">
          <span className="rounded-full border border-borderSoft bg-bgTertiary px-2.5 py-1">Quality filters on by default</span>
          <span className="rounded-full border border-borderSoft bg-bgTertiary px-2.5 py-1">
            Suppressed: {duplicateSuppressed} duplicates, {filteredResult.filteredOld} old, {filteredResult.filteredLowImpact} low-impact
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary">
            Signal Autopilot
          </span>
          <button
            type="button"
            onClick={() => setAutopilotMode("conservative")}
            className={`motion-press rounded-md border px-3 py-2 transition ${
              autopilotMode === "conservative"
                ? "border-accentPrimary/60 bg-accentPrimary/15 text-accentPrimary"
                : "border-borderSoft bg-bgTertiary text-textSecondary hover:bg-bgPrimary hover:text-textPrimary"
            }`}
          >
            Conservative
          </button>
          <button
            type="button"
            onClick={() => setAutopilotMode("balanced")}
            className={`motion-press rounded-md border px-3 py-2 transition ${
              autopilotMode === "balanced"
                ? "border-accentPrimary/60 bg-accentPrimary/15 text-accentPrimary"
                : "border-borderSoft bg-bgTertiary text-textSecondary hover:bg-bgPrimary hover:text-textPrimary"
            }`}
          >
            Balanced
          </button>
          <button
            type="button"
            onClick={() => setAutopilotMode("frontier")}
            className={`motion-press rounded-md border px-3 py-2 transition ${
              autopilotMode === "frontier"
                ? "border-accentPrimary/60 bg-accentPrimary/15 text-accentPrimary"
                : "border-borderSoft bg-bgTertiary text-textSecondary hover:bg-bgPrimary hover:text-textPrimary"
            }`}
          >
            Frontier
          </button>
        </div>

        <div className="mt-3 rounded-md border border-borderSoft bg-bgTertiary/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-textPrimary">Today&apos;s Priority Queue</p>
            <span className="text-xs text-textSecondary">
              Mode: {autopilotMode} • {autopilotQueue.length} {autopilotQueue.length === 1 ? "story" : "stories"}
            </span>
          </div>
          <ul className="mt-2 space-y-2">
            {autopilotQueue.map((item, index) => (
              <li key={item.article.id} className="rounded-md border border-borderSoft bg-bgPrimary/60 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-1 text-sm font-medium text-textPrimary">
                    {index + 1}. {item.article.title}
                  </p>
                  <span className="rounded-full border border-borderSoft bg-bgTertiary px-2 py-0.5 text-[11px] text-textSecondary">
                    Score {Math.round(item.score)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-textSecondary">
                  {rankingReasonTextMap?.[item.article.id] ?? "Ranked by signal quality and impact."}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => setAdaptiveEnabled((current) => !current)}
            className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
          >
            {adaptiveEnabled ? "Disable Adaptive Ranking" : "Enable Adaptive Ranking"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsManualRefresh(true);
              setStatusMessage("Refreshing feed...");
              setRefreshToken((current) => current + 1);
            }}
            disabled={streamHealth.isPaused}
            className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary disabled:opacity-50"
          >
            {isManualRefresh || loading ? "Refreshing..." : "Refresh Recommendations"}
          </button>
          <button
            type="button"
            onClick={() => {
              clearBehaviorProfile();
              setSummaryToken((current) => current + 1);
            }}
            className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
          >
            Reset Taste Profile
          </button>
          <button
            type="button"
            onClick={() => setAnalyticsOpen((current) => !current)}
            className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
            aria-expanded={analyticsOpen}
          >
            {analyticsOpen ? "Hide Analytics" : "Show Analytics"}
          </button>
        </div>
        <p aria-live="polite" className="sr-only">
          {statusMessage}
        </p>
        {feedError ? (
          <div className="mt-3 rounded-md border border-accentDanger/50 bg-accentDanger/10 p-3 text-sm text-accentDanger">
            <p>{feedError}</p>
            <p className="mt-1 text-xs text-textSecondary">
              Last known good: {formatUtcDateTime(lastKnownGoodAt, "Unavailable")}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsManualRefresh(true);
                setStatusMessage("Retrying feed refresh...");
                setRefreshToken((current) => current + 1);
              }}
              className="motion-press mt-2 min-h-11 rounded-md border border-borderSoft bg-bgPrimary px-3 py-2 text-xs text-textSecondary transition hover:text-textPrimary"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="filter-choreo-bar mt-3 flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => setFilters((current) => ({ ...current, last24h: !current.last24h }))}
            className={`glass-control motion-press motion-chip rounded-md px-3 py-2 transition ${
              filters.last24h
                ? "border-accentPrimary/60 bg-accentPrimary/18 text-accentPrimary"
                : "text-textSecondary hover:bg-bgPrimary/70 hover:text-textPrimary"
            }`}
          >
            Last 24h
          </button>
          <button
            type="button"
            onClick={() => setFilters((current) => ({ ...current, highImpact: !current.highImpact }))}
            className={`glass-control motion-press motion-chip rounded-md px-3 py-2 transition ${
              filters.highImpact
                ? "border-accentPrimary/60 bg-accentPrimary/18 text-accentPrimary"
                : "text-textSecondary hover:bg-bgPrimary/70 hover:text-textPrimary"
            }`}
          >
            High Impact
          </button>
          <button
            type="button"
            onClick={() => setFilters((current) => ({ ...current, primarySourcesOnly: !current.primarySourcesOnly }))}
            className={`glass-control motion-press motion-chip rounded-md px-3 py-2 transition ${
              filters.primarySourcesOnly
                ? "border-accentPrimary/60 bg-accentPrimary/18 text-accentPrimary"
                : "text-textSecondary hover:bg-bgPrimary/70 hover:text-textPrimary"
            }`}
          >
            Primary Sources Only
          </button>
        </div>

        {analyticsOpen ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2 text-xs text-textSecondary">
              <span className="rounded-md border border-borderSoft bg-bgTertiary px-2 py-1">
                Interactions: {behaviorSummary.interactions}
              </span>
              <span className="rounded-md border border-borderSoft bg-bgTertiary px-2 py-1">
                Top sources: {behaviorSummary.topSources.join(", ") || "Learning"}
              </span>
              <span className="rounded-md border border-borderSoft bg-bgTertiary px-2 py-1">
                Top categories: {behaviorSummary.topCategories.join(", ") || "Learning"}
              </span>
              <span className="rounded-md border border-borderSoft bg-bgTertiary px-2 py-1">
                Top topics: {behaviorSummary.topTopics.join(", ") || "Learning"}
              </span>
              <span className="rounded-md border border-borderSoft bg-bgTertiary px-2 py-1">
                Graph density: {(behaviorSummary.graphDensity * 100).toFixed(0)}%
              </span>
            </div>
            <SignalGraphPanel snapshot={signalGraphSnapshot} />
          </div>
        ) : null}
      </div>

      {loading && baseArticles.length === 0 ? (
        <FeedSkeletonGrid count={6} />
      ) : (
        <FeedGrid
          articles={renderedArticles}
          rankingReasons={rankingReasonTextMap}
          compactCards
          suppressionActive={duplicateSuppressed > 0 || filteredResult.filteredOld > 0}
        />
      )}
    </section>
  );
}
