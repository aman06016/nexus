"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Article, fetchSavedArticles } from "@/lib/api/client";
import { getOrCreateSessionId } from "@/lib/session/session";
import { ArticleCard } from "@/components/ArticleCard";
import { useToast } from "@/components/feedback/ToastProvider";
import { emitActivityEvent } from "@/lib/collaboration/activity";
import { PresenceSnapshot, watchPresence } from "@/lib/collaboration/presence";
import { formatRelativeTime, formatUtcDateTime } from "@/lib/format/date";
import { FeedSkeletonGrid } from "@/components/feed/FeedSkeletonGrid";
import { ContextualEmptyState } from "@/components/empty/ContextualEmptyState";

type SavedWorkspacePageProps = {
  initialWorkspace: string;
};

export function SavedWorkspacePage({ initialWorkspace }: SavedWorkspacePageProps) {
  const { notify } = useToast();
  const [ownerSessionId, setOwnerSessionId] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [presence, setPresence] = useState<PresenceSnapshot>({ activeSessions: 1, activeTabs: 1 });
  const [refreshTick, setRefreshTick] = useState(0);
  const workspaceParam = initialWorkspace.trim();

  useEffect(() => {
    setOwnerSessionId(getOrCreateSessionId());
  }, []);

  const workspaceSessionId = workspaceParam || ownerSessionId;
  const isSharedWorkspace = workspaceParam.length > 0 && ownerSessionId.length > 0 && workspaceParam !== ownerSessionId;

  const loadSavedWorkspace = useCallback(async () => {
    if (!workspaceSessionId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchSavedArticles(workspaceSessionId, 0, 20);
      setArticles(result);
      const now = new Date();
      setLastSyncAt(now);
      emitActivityEvent("page-refresh", "Saved workspace refreshed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved articles");
    } finally {
      setLoading(false);
    }
  }, [workspaceSessionId]);

  useEffect(() => {
    loadSavedWorkspace();
  }, [loadSavedWorkspace, refreshTick]);

  useEffect(() => {
    if (!workspaceSessionId || !ownerSessionId) {
      return;
    }

    return watchPresence(`saved:${workspaceSessionId}`, ownerSessionId, setPresence);
  }, [ownerSessionId, workspaceSessionId]);

  const shareLink = useMemo(() => {
    if (!workspaceSessionId || typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/saved?workspace=${encodeURIComponent(workspaceSessionId)}`;
  }, [workspaceSessionId]);

  const onCopyShareLink = async () => {
    if (!shareLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      notify("Workspace link copied", "success");
    } catch {
      notify("Clipboard write failed", "error");
    }
  };

  if (loading) {
    return (
      <section className="space-y-6" aria-live="polite" aria-busy="true">
        <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
          <h1 className="text-2xl font-semibold">Saved Workspace</h1>
          <p className="mt-2 text-textSecondary">Loading saved workspace...</p>
        </div>
        <FeedSkeletonGrid count={6} />
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Saved Workspace</h1>
            <p className="mt-2 text-textSecondary">
              {isSharedWorkspace
                ? "Shared workspace mode. Actions update this shared saved list."
                : "Your personal saved list. Share the workspace link to collaborate in real time."}
            </p>
          </div>
          <span className="rounded-full border border-borderSoft bg-bgTertiary px-2.5 py-1 text-xs font-medium text-textSecondary">
            {presence.activeSessions} active session{presence.activeSessions === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-textSecondary">
          <span className="rounded-md border border-borderSoft bg-bgTertiary px-2 py-1">
            Workspace ID: {workspaceSessionId || "loading..."}
          </span>
          <span className="rounded-md border border-borderSoft bg-bgTertiary px-2 py-1">
            Last sync: {formatUtcDateTime(lastSyncAt, "Never")} ({formatRelativeTime(lastSyncAt, "just now")})
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => setRefreshTick((current) => current + 1)}
            className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
          >
            Refresh Workspace
          </button>
          <button
            type="button"
            onClick={onCopyShareLink}
            className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
          >
            Copy Share Link
          </button>
          {isSharedWorkspace ? (
            <Link
              href="/saved"
              className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
            >
              Return to My Workspace
            </Link>
          ) : null}
        </div>
      </div>

      {articles.length === 0 ? (
        <ContextualEmptyState
          title="No saved articles yet"
          description="This workspace does not have any saved stories."
          guidance={[
            "Browse Latest or Trending and save high-signal stories.",
            "Share this workspace link after you add a few anchor stories."
          ]}
          actions={[
            { href: "/", label: "Browse Latest" },
            { href: "/trending", label: "View Trending" }
          ]}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              initialSaveActive
              revealIndex={index}
              interactionSessionId={workspaceSessionId}
              onSaveStateChange={(active) => {
                if (!active) {
                  setArticles((current) => current.filter((saved) => saved.id !== article.id));
                }
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
