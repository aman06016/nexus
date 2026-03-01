import { FeedGrid } from "@/features/feed/FeedGrid";
import { fetchDigest } from "@/lib/api/client";
import { DiscoveryAssistant } from "@/components/discovery/DiscoveryAssistant";
import { ContextualEmptyState } from "@/components/empty/ContextualEmptyState";

export default async function DigestPage() {
  const digestArticles = await fetchDigest(10).catch(() => []);

  return (
    <section className="space-y-6">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h1 className="text-2xl font-semibold">Daily Digest</h1>
        <p className="mt-2 text-textSecondary">Top 10 ranked stories by impact, engagement, and freshness.</p>
      </div>

      {digestArticles.length === 0 ? (
        <ContextualEmptyState
          title="Digest is not available yet"
          description="No ranked stories are ready for today."
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
