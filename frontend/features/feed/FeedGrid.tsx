"use client";

import { useEffect, useMemo, useState } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { Article, fetchInteractionState, InteractionState } from "@/lib/api/client";
import { getOrCreateSessionId } from "@/lib/session/session";

type FeedGridProps = {
  articles: Article[];
  rankingReasons?: Record<string, string>;
  compactCards?: boolean;
  suppressionActive?: boolean;
};

export function FeedGrid({
  articles,
  rankingReasons,
  compactCards = false,
  suppressionActive = false
}: FeedGridProps) {
  const [stateMap, setStateMap] = useState<Record<string, InteractionState>>({});
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const articleIds = useMemo(() => articles.map((article) => article.id).filter(Boolean), [articles]);
  const visibleArticles = useMemo(
    () => articles.filter((article) => !hiddenIds.has(article.id)),
    [articles, hiddenIds]
  );

  useEffect(() => {
    setHiddenIds(new Set());
  }, [articles]);

  useEffect(() => {
    let canceled = false;
    const hydrate = async () => {
      if (articleIds.length === 0) {
        setStateMap({});
        return;
      }

      try {
        const response = await fetchInteractionState(getOrCreateSessionId(), articleIds);
        if (!canceled) {
          setStateMap(response.states ?? {});
        }
      } catch {
        if (!canceled) {
          setStateMap({});
        }
      }
    };

    hydrate();
    return () => {
      canceled = true;
    };
  }, [articleIds]);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {visibleArticles.map((article, index) => (
        <ArticleCard
          key={article.id}
          article={article}
          initialSaveActive={stateMap[article.id]?.saved ?? false}
          initialLikeActive={stateMap[article.id]?.liked ?? false}
          revealIndex={index}
          rankingReason={rankingReasons?.[article.id]}
          compact={compactCards}
          suppressionActive={suppressionActive}
          onSkip={(articleId) =>
            setHiddenIds((current) => {
              const next = new Set(current);
              next.add(articleId);
              return next;
            })
          }
        />
      ))}
    </div>
  );
}
