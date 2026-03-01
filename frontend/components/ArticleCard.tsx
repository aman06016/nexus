"use client";

import Link from "next/link";
import { useState } from "react";
import { Article, toggleLike, toggleSave } from "@/lib/api/client";
import { getOrCreateSessionId } from "@/lib/session/session";
import { useToast } from "@/components/feedback/ToastProvider";
import { formatRelativeTime, formatUtcDate } from "@/lib/format/date";
import { emitActivityEvent } from "@/lib/collaboration/activity";
import { trackBehaviorSignal } from "@/lib/personalization/behavior";
import { getSourceTrust } from "@/lib/trust/sourceTrust";
import { WhyItMattersBrief, generateWhyItMattersBrief } from "@/lib/ai/briefing";

type ArticleCardProps = {
  article: Article;
  initialSaveActive?: boolean;
  initialLikeActive?: boolean;
  onSaveStateChange?: (active: boolean) => void;
  revealIndex?: number;
  interactionSessionId?: string;
  rankingReason?: string;
};

const META_TOKEN_PATTERN =
  /\b(?:Announcements|Product|Policy|Research|Model Release)\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}\b/gi;
const REVERSED_META_TOKEN_PATTERN =
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}\s*(?:Announcements|Product|Policy|Research|Model Release)\b/gi;

function normalizeHeadline(rawTitle: string): string {
  const compact = rawTitle.replace(/\s+/g, " ").trim();
  const withoutMeta = compact
    .replace(META_TOKEN_PATTERN, " ")
    .replace(REVERSED_META_TOKEN_PATTERN, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return withoutMeta || compact;
}

export function ArticleCard({
  article,
  initialSaveActive = false,
  initialLikeActive = false,
  onSaveStateChange,
  revealIndex = 0,
  interactionSessionId,
  rankingReason
}: ArticleCardProps) {
  const [likes, setLikes] = useState(article.stats?.likes ?? 0);
  const [saves, setSaves] = useState(article.stats?.saves ?? 0);
  const [likeActive, setLikeActive] = useState(initialLikeActive);
  const [saveActive, setSaveActive] = useState(initialSaveActive);
  const [busy, setBusy] = useState<"like" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<WhyItMattersBrief | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const { notify } = useToast();

  const publishedLabel = formatUtcDate(article.publishedAt);
  const categoryLabel = article.category?.trim() || "General";
  const sourceName = article.source?.name?.trim() || "Unknown source";
  const sourceDomain = article.source?.domain?.trim();
  const sourceTrust = getSourceTrust(sourceDomain);
  const title = normalizeHeadline(article.title);
  const titleHref = article.url?.trim() ? article.url : `/search?q=${encodeURIComponent(article.title)}`;
  const opensExternal = !!article.url?.trim();

  const handleLike = async () => {
    if (!article.id || busy) {
      return;
    }

    setBusy("like");
    setError(null);
    try {
      const response = await toggleLike(article.id, interactionSessionId ?? getOrCreateSessionId());
      setLikeActive(response.active);
      setLikes(response.totalCount);
      notify(response.active ? "Added like" : "Removed like", "success");
      emitActivityEvent("workspace-update", response.active ? "Article liked" : "Like removed");
      if (response.active) {
        trackBehaviorSignal(article, "like");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle like";
      setError(message);
      notify(message, "error");
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    if (!article.id || busy) {
      return;
    }

    setBusy("save");
    setError(null);
    try {
      const response = await toggleSave(article.id, interactionSessionId ?? getOrCreateSessionId());
      setSaveActive(response.active);
      setSaves(response.totalCount);
      onSaveStateChange?.(response.active);
      notify(response.active ? "Saved to your list" : "Removed from saved list", "success");
      emitActivityEvent("workspace-update", response.active ? "Article saved" : "Saved article removed");
      if (response.active) {
        trackBehaviorSignal(article, "save");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle save";
      setError(message);
      notify(message, "error");
    } finally {
      setBusy(null);
    }
  };

  const handleBriefToggle = async () => {
    if (briefLoading) {
      return;
    }

    if (brief) {
      setBriefOpen((current) => !current);
      return;
    }

    setBriefOpen(true);
    setBriefLoading(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 520));
      const generated = generateWhyItMattersBrief(article);
      setBrief(generated);
      notify("Why It Matters brief generated", "success");
      emitActivityEvent("workspace-update", "Why It Matters brief generated");
      trackBehaviorSignal(article, "read");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate brief";
      setError(message);
      notify(message, "error");
      setBriefOpen(false);
    } finally {
      setBriefLoading(false);
    }
  };

  return (
    <article
      className="motion-fade-up motion-lift rounded-card border border-borderSoft bg-bgSecondary/75 p-5 transition hover:shadow-glow"
      style={{ animationDelay: `${Math.min(revealIndex * 40, 260)}ms` }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-borderSoft bg-bgTertiary px-2.5 py-1 font-medium text-textSecondary">
          {categoryLabel}
        </span>
        <span className="text-textSecondary">{sourceName}</span>
        {sourceDomain ? <span className="text-textTertiary">({sourceDomain})</span> : null}
        <span
          title={sourceTrust.rationale}
          className={`rounded-full border px-2 py-0.5 ${
            sourceTrust.tone === "high"
              ? "border-accentSuccess/50 bg-accentSuccess/10 text-accentSuccess"
              : sourceTrust.tone === "medium"
                ? "border-accentPrimary/50 bg-accentPrimary/10 text-accentPrimary"
                : "border-borderSoft bg-bgTertiary text-textSecondary"
          }`}
        >
          {sourceTrust.label}
        </span>
        <span className="text-textTertiary">•</span>
        <time className="text-textSecondary" dateTime={article.publishedAt}>
          {publishedLabel}
        </time>
      </div>

      <h3 className="line-clamp-2 text-xl font-semibold leading-snug text-textPrimary">
        <Link
          href={titleHref}
          target={opensExternal ? "_blank" : undefined}
          rel={opensExternal ? "noreferrer noopener" : undefined}
          className="transition hover:text-accentSecondary"
          onClick={() => trackBehaviorSignal(article, "read")}
        >
          {title}
        </Link>
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-textSecondary">
        {article.summary ?? "Summary pending ingestion."}
      </p>
      {rankingReason ? (
        <p className="mt-3 rounded-md border border-borderSoft bg-bgTertiary/70 px-2.5 py-1.5 text-xs text-textSecondary">
          Why ranked: {rankingReason}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-borderSoft bg-bgTertiary px-2.5 py-1 text-xs font-medium text-textSecondary">
            Impact: {article.impactScore ?? 0}
          </span>
          <button
            type="button"
            onClick={handleBriefToggle}
            disabled={briefLoading}
            className={`motion-press min-h-8 rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-60 ${
              briefOpen
                ? "border-accentPrimary/60 bg-accentPrimary/15 text-accentPrimary"
                : "border-borderSoft bg-bgTertiary text-textSecondary hover:bg-bgPrimary hover:text-textPrimary"
            }`}
          >
            {briefLoading ? "Generating..." : briefOpen ? "Hide Brief" : "Why It Matters"}
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-textSecondary">
          <button
            type="button"
            aria-pressed={likeActive}
            disabled={busy !== null}
            onClick={handleLike}
            className={`motion-press min-h-9 rounded-md border px-3 py-2 font-medium transition disabled:opacity-60 ${
              likeActive
                ? "border-accentPrimary/60 bg-accentPrimary/20 text-accentPrimary"
                : "border-borderSoft bg-bgTertiary hover:bg-bgPrimary hover:text-textPrimary"
            }`}
          >
            {busy === "like" ? "Updating..." : likeActive ? "Liked" : "Like"} {likes}
          </button>
          <button
            type="button"
            aria-pressed={saveActive}
            disabled={busy !== null}
            onClick={handleSave}
            className={`motion-press min-h-9 rounded-md border px-3 py-2 font-medium transition disabled:opacity-60 ${
              saveActive
                ? "border-accentSecondary/60 bg-accentSecondary/20 text-accentSecondary"
                : "border-borderSoft bg-bgTertiary hover:bg-bgPrimary hover:text-textPrimary"
            }`}
          >
            {busy === "save" ? "Updating..." : saveActive ? "Saved" : "Save"} {saves}
          </button>
        </div>
      </div>
      {briefOpen ? (
        <section className="mt-4 rounded-md border border-borderSoft bg-bgTertiary/70 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-textPrimary">Why It Matters</h4>
            {brief ? (
              <div className="flex flex-wrap gap-2 text-[11px] text-textSecondary">
                <span className="rounded-full border border-borderSoft bg-bgPrimary px-2 py-0.5">
                  Confidence {brief.confidence}%
                </span>
                <span className="rounded-full border border-borderSoft bg-bgPrimary px-2 py-0.5">
                  Generated {formatRelativeTime(brief.generatedAt)}
                </span>
              </div>
            ) : null}
          </div>

          {briefLoading ? (
            <div className="space-y-2" aria-hidden="true">
              <div className="skeleton-block h-4 w-32" />
              <div className="skeleton-block h-4 w-full" />
              <div className="skeleton-block h-4 w-11/12" />
              <div className="skeleton-block h-4 w-36" />
              <div className="skeleton-block h-4 w-full" />
              <div className="skeleton-block h-4 w-10/12" />
            </div>
          ) : brief ? (
            <div className="space-y-3 text-sm text-textSecondary">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-textTertiary">What happened</p>
                <p className="mt-1 leading-relaxed">{brief.whatHappened}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-textTertiary">Why now</p>
                <p className="mt-1 leading-relaxed">{brief.whyNow}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-textTertiary">Implication</p>
                <p className="mt-1 leading-relaxed">{brief.implication}</p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
      {error ? <p className="mt-2 text-xs text-accentDanger">{error}</p> : null}
    </article>
  );
}
