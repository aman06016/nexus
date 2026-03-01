import { Article } from "@/lib/api/client";

export function ArticleCard({ article }: { article: Article }) {
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
        <span>Likes: {article.stats?.likes ?? 0}</span>
        <span>Saves: {article.stats?.saves ?? 0}</span>
      </div>
    </article>
  );
}
