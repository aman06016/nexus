import { fetchAdminOverview, fetchArticles } from "@/lib/api/client";
import Link from "next/link";
import { DiscoveryAssistant } from "@/components/discovery/DiscoveryAssistant";
import { ContextualEmptyState } from "@/components/empty/ContextualEmptyState";
import { AdaptiveFeedSection } from "@/components/personalization/AdaptiveFeedSection";
import { PreferenceOnboarding } from "@/components/personalization/PreferenceOnboarding";
import { MyBriefRail } from "@/components/personalization/MyBriefRail";
import { TrustSignals } from "@/components/trust/TrustSignals";
import { ShockwaveAlertsPanel } from "@/components/radar/ShockwaveAlertsPanel";
import { TeamPulseRail } from "@/components/collaboration/TeamPulseRail";

export default async function HomePage() {
  const [articles, overview] = await Promise.all([
    fetchArticles(0, 20).catch(() => []),
    fetchAdminOverview().catch(() => null)
  ]);

  return (
    <section className="space-y-6">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h1 className="text-2xl font-semibold">Latest AI News</h1>
        <p className="mt-2 text-textSecondary">Live feed from the NEXUS ingestion pipeline.</p>
      </div>

      <section className="rounded-card border border-borderSoft bg-bgSecondary/80 p-6">
        <h2 className="text-lg font-semibold">Start Here</h2>
        <p className="mt-2 text-sm text-textSecondary">
          New to NEXUS? Follow this path to get value in under two minutes.
        </p>
        <ol className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <li className="rounded-md border border-borderSoft bg-bgTertiary p-3 text-sm text-textSecondary">
            <span className="font-medium text-textPrimary">1. Scan Trending</span>
            <p className="mt-1">Open top-impact stories sorted by engagement and freshness.</p>
          </li>
          <li className="rounded-md border border-borderSoft bg-bgTertiary p-3 text-sm text-textSecondary">
            <span className="font-medium text-textPrimary">2. Save what matters</span>
            <p className="mt-1">Build your personal monitoring list with one click.</p>
          </li>
          <li className="rounded-md border border-borderSoft bg-bgTertiary p-3 text-sm text-textSecondary">
            <span className="font-medium text-textPrimary">3. Refine with Search</span>
            <p className="mt-1">Filter by category and company to narrow signal quickly.</p>
          </li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link
            href="/trending"
            className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
          >
            Open Trending
          </Link>
          <Link
            href="/search?q=agentic%20ai"
            className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
          >
            Try a Search
          </Link>
        </div>
      </section>
      <PreferenceOnboarding />
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
      <ShockwaveAlertsPanel />
      {articles.length === 0 ? (
        <ContextualEmptyState
          title="No stories available right now"
          description="The feed has not received any publishable items yet."
          guidance={[
            "Open Admin and run a scrape cycle.",
            "After ingestion, recompute trending to seed ranking."
          ]}
          actions={[
            { href: "/admin", label: "Open Admin Controls" },
            { href: "/trending", label: "Check Trending" }
          ]}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <DiscoveryAssistant articles={articles} scopeLabel="the latest feed" />
            <AdaptiveFeedSection
              articles={articles}
              includePersonalizedEndpoint
              strictQualityMode
            />
          </div>
          <div className="space-y-6">
            <TeamPulseRail />
            <MyBriefRail articles={articles} />
          </div>
        </div>
      )}
    </section>
  );
}
