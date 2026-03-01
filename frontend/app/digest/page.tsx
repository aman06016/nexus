import { FeedGrid } from "@/features/feed/FeedGrid";
import { fetchDigest } from "@/lib/api/client";
import { DiscoveryAssistant } from "@/components/discovery/DiscoveryAssistant";
import { ContextualEmptyState } from "@/components/empty/ContextualEmptyState";
import { filterDigestQuality } from "@/lib/quality/articleQuality";

export default async function DigestPage() {
  const rawDigestArticles = await fetchDigest(20).catch(() => []);
  const quality = filterDigestQuality(rawDigestArticles);
  const digestArticles = quality.accepted.slice(0, 10);
  const constraintsPassed = digestArticles.length > 0;
  const filteredOutCount =
    quality.rejected.stale +
    quality.rejected.lowImpact +
    quality.rejected.lowRelevance +
    quality.rejected.invalidDate;

  return (
    <section className="space-y-6">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h1 className="text-2xl font-semibold">Daily Digest</h1>
        <p className="mt-2 text-textSecondary">
          {constraintsPassed
            ? "Top 10 ranked stories by impact, engagement, and freshness."
            : "Digest is waiting for enough fresh, high-impact stories to meet quality guardrails."}
        </p>
        <p className="mt-2 text-xs text-textSecondary">
          Guardrails: last 72 hours and impact &gt;= 45.
          {filteredOutCount > 0 ? ` Filtered ${filteredOutCount} stale or low-signal item${filteredOutCount === 1 ? "" : "s"}.` : ""}
        </p>
      </div>

      {digestArticles.length === 0 ? (
        <ContextualEmptyState
          title="Digest is not available yet"
          description={
            rawDigestArticles.length > 0
              ? "Stories were available, but none met digest freshness and impact guardrails."
              : "No ranked stories are ready for today."
          }
          guidance={[
            "Run a scrape cycle to ingest fresh articles.",
            "Recompute trending to rank stories by impact, engagement, and freshness."
          ]}
          actions={[
            { href: "/admin", label: "Open Admin Controls" },
            { href: "/trending", label: "Check Trending" }
          ]}
        />
      ) : (
        <>
          <DiscoveryAssistant articles={digestArticles} scopeLabel="the daily digest" />
          <FeedGrid articles={digestArticles} />
        </>
      )}
    </section>
  );
}
