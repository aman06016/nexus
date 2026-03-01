"use client";

import { useEffect, useMemo, useState } from "react";
import { Article, fetchPersonalizedFeed } from "@/lib/api/client";
import { FeedGrid } from "@/features/feed/FeedGrid";
import { FeedSkeletonGrid } from "@/components/feed/FeedSkeletonGrid";
import { getOrCreateSessionId } from "@/lib/session/session";
import {
  clearBehaviorProfile,
  getBehaviorSummary,
  getSignalGraphSnapshot,
  rankArticlesWithReasons,
  subscribeBehaviorUpdates
} from "@/lib/personalization/behavior";
import { SignalGraphPanel } from "@/components/personalization/SignalGraphPanel";

type AdaptiveFeedSectionProps = {
  articles: Article[];
  includePersonalizedEndpoint?: boolean;
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

export function AdaptiveFeedSection({
  articles,
  includePersonalizedEndpoint = true
}: AdaptiveFeedSectionProps) {
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(true);
  const [loading, setLoading] = useState(includePersonalizedEndpoint);
  const [baseArticles, setBaseArticles] = useState<Article[]>(articles);
  const [refreshToken, setRefreshToken] = useState(0);
  const [summaryToken, setSummaryToken] = useState(0);

  useEffect(() => {
    setBaseArticles(articles);
  }, [articles]);

  useEffect(() => {
    if (!includePersonalizedEndpoint) {
      setLoading(false);
      return;
    }

    let canceled = false;
    const loadPersonalized = async () => {
      setLoading(true);
      try {
        const recommendations = await fetchPersonalizedFeed(getOrCreateSessionId(), 0, 20).catch(() => []);
        if (!canceled && recommendations.length > 0) {
          setBaseArticles(dedupeArticles([...recommendations, ...articles]));
        } else if (!canceled) {
          setBaseArticles(articles);
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    loadPersonalized();
    return () => {
      canceled = true;
    };
  }, [articles, includePersonalizedEndpoint, refreshToken]);

  useEffect(() => {
    return subscribeBehaviorUpdates(() => setSummaryToken((current) => current + 1));
  }, []);

  const behaviorSummary = useMemo(() => getBehaviorSummary(), [summaryToken]);
  const signalGraphSnapshot = useMemo(() => getSignalGraphSnapshot(), [summaryToken]);

  const rankingResult = useMemo(() => {
    if (!adaptiveEnabled) {
      return null;
    }
    return rankArticlesWithReasons(baseArticles);
  }, [adaptiveEnabled, baseArticles, summaryToken]);

  const renderedArticles = rankingResult?.ranked ?? baseArticles;
  const rankingReasonTextMap = useMemo(
    () =>
      rankingResult
        ? Object.fromEntries(
            Object.entries(rankingResult.reasons).map(([articleId, reason]) => [articleId, reason.text])
          )
        : undefined,
    [rankingResult]
  );

  return (
    <section className="space-y-4">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Adaptive Ranking</h2>
            <p className="mt-1 text-sm text-textSecondary">
              Learns from reads, likes, saves, and source affinity to tune your feed.
            </p>
          </div>
          <span className="rounded-full border border-borderSoft bg-bgTertiary px-2.5 py-1 text-xs font-medium text-textSecondary">
            Profile: {behaviorSummary.confidence}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-textSecondary">
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
            onClick={() => setRefreshToken((current) => current + 1)}
            className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
          >
            Refresh Recommendations
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
        </div>

        <div className="mt-3">
          <SignalGraphPanel snapshot={signalGraphSnapshot} />
        </div>
      </div>

      {loading ? (
        <FeedSkeletonGrid count={6} />
      ) : (
        <FeedGrid
          articles={renderedArticles}
          rankingReasons={rankingReasonTextMap}
        />
      )}
    </section>
  );
}
