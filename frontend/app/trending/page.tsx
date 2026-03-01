import { fetchAdminOverview, fetchTrending } from "@/lib/api/client";
import { DiscoveryAssistant } from "@/components/discovery/DiscoveryAssistant";
import { ContextualEmptyState } from "@/components/empty/ContextualEmptyState";
import { AdaptiveFeedSection } from "@/components/personalization/AdaptiveFeedSection";
import { TrustSignals } from "@/components/trust/TrustSignals";

export default async function TrendingPage() {
  const [articles, overview] = await Promise.all([
    fetchTrending(0, 20).catch(() => []),
    fetchAdminOverview().catch(() => null)
  ]);

  return (
    <section className="space-y-6">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h1 className="text-2xl font-semibold">Trending</h1>
        <p className="mt-2 text-textSecondary">Highest-ranking stories by impact, engagement, and freshness.</p>
      </div>
      <TrustSignals
        monitoredSources={
          overview?.totalSources ??
          Math.max(
            1,
            new Set(
              articles
                .map((article) => article.source?.domain?.trim())
                .filter((domain): domain is string => Boolean(domain))
            ).size
          )
        }
        rankedStories={articles.length}
        publishedStories={overview?.publishedArticles ?? articles.length}
        updatedAt={overview?.timestamp}
      />
      {articles.length === 0 ? (
        <ContextualEmptyState
          title="Trending has no ranked stories"
          description="Ranking needs a fresh ingestion cycle before signals can be computed."
          guidance={[
            "Run scrape from Admin to ingest source updates.",
            "Then run trending recompute and return here."
          ]}
          actions={[
            { href: "/admin", label: "Open Admin Controls" },
            { href: "/", label: "Back to Latest" }
          ]}
        />
      ) : (
        <>
          <DiscoveryAssistant articles={articles} scopeLabel="trending stories" />
          <AdaptiveFeedSection articles={articles} includePersonalizedEndpoint={false} />
        </>
      )}
    </section>
  );
}
