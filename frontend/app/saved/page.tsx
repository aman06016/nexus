"use client";

import { useEffect, useState } from "react";
import { Article, fetchSavedArticles } from "@/lib/api/client";
import { getOrCreateSessionId } from "@/lib/session/session";
import { FeedGrid } from "@/features/feed/FeedGrid";

export default function SavedPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const sessionId = getOrCreateSessionId();
        const result = await fetchSavedArticles(sessionId, 0, 20);
        setArticles(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load saved articles");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <section className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h1 className="text-2xl font-semibold">Saved Articles</h1>
        <p className="mt-2 text-textSecondary">Loading saved articles...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h1 className="text-2xl font-semibold">Saved Articles</h1>
        <p className="mt-2 text-accentDanger">{error}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h1 className="text-2xl font-semibold">Saved Articles</h1>
        <p className="mt-2 text-textSecondary">Articles saved by your current anonymous session.</p>
      </div>

      {articles.length === 0 ? (
        <section className="rounded-card border border-borderSoft bg-bgSecondary p-6 text-textSecondary">
          No saved articles yet. Save stories from the feed to populate this list.
        </section>
      ) : (
        <FeedGrid articles={articles} />
      )}
    </section>
  );
}
