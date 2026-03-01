"use client";

import { useState } from "react";
import { Article, toggleLike, toggleSave } from "@/lib/api/client";
import { getOrCreateSessionId } from "@/lib/session/session";

export function ArticleCard({ article }: { article: Article }) {
  const [likes, setLikes] = useState(article.stats?.likes ?? 0);
  const [saves, setSaves] = useState(article.stats?.saves ?? 0);
  const [likeActive, setLikeActive] = useState(false);
  const [saveActive, setSaveActive] = useState(false);
  const [busy, setBusy] = useState<"like" | "save" | null>(null);

  const handleLike = async () => {
    if (!article.id || busy) {
      return;
    }

    setBusy("like");
    try {
      const response = await toggleLike(article.id, getOrCreateSessionId());
      setLikeActive(response.active);
      setLikes(response.totalCount);
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    if (!article.id || busy) {
      return;
    }

    setBusy("save");
    try {
      const response = await toggleSave(article.id, getOrCreateSessionId());
      setSaveActive(response.active);
      setSaves(response.totalCount);
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="rounded-card border border-borderSoft bg-bgSecondary/70 p-4 transition hover:scale-[1.01] hover:shadow-glow">
      <div className="mb-2 flex items-center gap-2 text-xs text-textSecondary">
        <span className="rounded-md bg-bgTertiary px-2 py-0.5">{article.category ?? "General"}</span>
        <span>{article.source?.name ?? "Unknown source"}</span>
      </div>

      <h3 className="line-clamp-2 text-lg font-semibold text-textPrimary">{article.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-textSecondary">{article.summary ?? "Summary pending ingestion."}</p>

      <div className="mt-4 flex items-center gap-4 text-xs text-textSecondary">
        <span>Impact: {article.impactScore ?? 0}</span>
        <button
          type="button"
          disabled={busy !== null}
          onClick={handleLike}
          className={`rounded px-2 py-1 transition ${likeActive ? "bg-accentPrimary/20 text-accentPrimary" : "bg-bgTertiary hover:bg-bgPrimary"}`}
        >
          Like {likes}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={handleSave}
          className={`rounded px-2 py-1 transition ${saveActive ? "bg-accentSecondary/20 text-accentSecondary" : "bg-bgTertiary hover:bg-bgPrimary"}`}
        >
          Save {saves}
        </button>
      </div>
    </article>
  );
}
