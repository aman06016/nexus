"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Article, fetchSavedArticles } from "@/lib/api/client";
import { getOrCreateSessionId } from "@/lib/session/session";
import {
  getBehaviorSummary,
  getReadArticleIds,
  subscribeBehaviorUpdates
} from "@/lib/personalization/behavior";
import {
  getUserPreferences,
  subscribeUserPreferences
} from "@/lib/personalization/preferences";

type MyBriefRailProps = {
  articles: Article[];
};

export function MyBriefRail({ articles }: MyBriefRailProps) {
  const [savedCount, setSavedCount] = useState(0);
  const [token, setToken] = useState(0);

  useEffect(() => {
    let canceled = false;
    const loadSaved = async () => {
      const saved = await fetchSavedArticles(getOrCreateSessionId(), 0, 100).catch(() => []);
      if (!canceled) {
        setSavedCount(saved.length);
      }
    };
    loadSaved();
    return () => {
      canceled = true;
    };
  }, [token]);

  useEffect(() => subscribeBehaviorUpdates(() => setToken((current) => current + 1)), []);
  useEffect(() => subscribeUserPreferences(() => setToken((current) => current + 1)), []);

  const behaviorSummary = useMemo(() => getBehaviorSummary(), [token]);
  const preferences = useMemo(() => getUserPreferences(), [token]);
  const unreadCount = useMemo(() => {
    const readIds = getReadArticleIds();
    return articles.filter((article) => article.id && !readIds.has(article.id)).length;
  }, [articles, token]);

  const followedTopics = useMemo(() => {
    const merged = [...(preferences?.topics ?? []), ...behaviorSummary.topTopics];
    return merged
      .filter(Boolean)
      .filter((value, index, all) => all.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index)
      .slice(0, 4);
  }, [preferences?.topics, behaviorSummary.topTopics]);

  return (
    <aside className="space-y-3 lg:sticky lg:top-24">
      <section className="rounded-card border border-borderSoft bg-bgSecondary p-4">
        <h3 className="text-sm font-semibold text-textPrimary">My Brief</h3>
        <div className="mt-3 space-y-2 text-xs text-textSecondary">
          <div className="rounded-md border border-borderSoft bg-bgTertiary px-3 py-2">
            Saved stories: <span className="font-semibold text-textPrimary">{savedCount}</span>
          </div>
          <div className="rounded-md border border-borderSoft bg-bgTertiary px-3 py-2">
            Unread in feed: <span className="font-semibold text-textPrimary">{unreadCount}</span>
          </div>
          <div className="rounded-md border border-borderSoft bg-bgTertiary px-3 py-2">
            Cadence: <span className="font-semibold text-textPrimary">{preferences?.deliveryCadence ?? "daily"}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {followedTopics.length > 0 ? (
            followedTopics.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-borderSoft bg-bgTertiary px-2 py-0.5 text-[11px] text-textSecondary"
              >
                #{topic}
              </span>
            ))
          ) : (
            <span className="text-xs text-textTertiary">No followed topics yet.</span>
          )}
        </div>
        <div className="mt-4 flex gap-2 text-sm">
          <Link
            href="/saved"
            className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
          >
            Open Saved
          </Link>
          <Link
            href="/digest"
            className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
          >
            Open Digest
          </Link>
        </div>
      </section>
    </aside>
  );
}

