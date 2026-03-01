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
import { SignalCoreHero } from "@/components/hero/SignalCoreHero";
import { DataHorizonDivider } from "@/components/dividers/DataHorizonDivider";
import { CommandCenterStrip } from "@/components/status/CommandCenterStrip";

export default async function HomePage() {
  const [articles, overview] = await Promise.all([
    fetchArticles(0, 20).catch(() => []),
    fetchAdminOverview().catch(() => null)
  ]);
  const monitoredSources =
    overview?.totalSources ??
    Math.max(
      1,
      new Set(
        articles
          .map((article) => article.source?.domain?.trim())
          .filter((domain): domain is string => Boolean(domain))
      ).size
    );
  const primaryCount = articles.filter((article) => (article.impactScore ?? 0) >= 60).length;
  const freshCount = articles.filter((article) => {
    if (!article.publishedAt) {
      return false;
    }
    const published = new Date(article.publishedAt).getTime();
    return Number.isFinite(published) && Date.now() - published <= 24 * 60 * 60 * 1000;
  }).length;
  const liveVelocity = Math.min(
    1,
    Math.max(0.25, (freshCount * 1.2 + primaryCount * 0.8) / Math.max(articles.length, 1))
  );

  return (
    <section className="space-y-6">
      <SignalCoreHero
        liveVelocity={liveVelocity}
        freshCount={freshCount}
        primaryCount={primaryCount}
        monitoredSources={monitoredSources}
      />
      <CommandCenterStrip liveVelocity={liveVelocity} monitoredSources={monitoredSources} />

      <section className="rounded-card border border-borderSoft bg-bgSecondary/60 p-4">
        <h2 className="section-display-title">Start Here</h2>
        <p className="mt-1 text-sm text-textSecondary">
          Go from scan to action in under two minutes.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Link
          href="/trending"
          className="motion-lift rounded-xl border border-borderSoft bg-bgPrimary/60 p-4 transition hover:border-accentPrimary/40"
        >
          <p className="text-xs uppercase tracking-wide text-textTertiary">Step 1</p>
          <h2 className="mt-1 text-base font-semibold">Scan Trending</h2>
          <p className="mt-1 text-sm text-textSecondary">Review highest-confidence movement first.</p>
        </Link>
        <Link
          href="/saved"
          className="motion-lift rounded-xl border border-borderSoft bg-bgPrimary/60 p-4 transition hover:border-accentPrimary/40"
        >
          <p className="text-xs uppercase tracking-wide text-textTertiary">Step 2</p>
          <h2 className="mt-1 text-base font-semibold">Build My Brief</h2>
          <p className="mt-1 text-sm text-textSecondary">Save key stories into your daily queue.</p>
        </Link>
        <Link
          href="/search?q=ai%20safety"
          className="motion-lift rounded-xl border border-borderSoft bg-bgPrimary/60 p-4 transition hover:border-accentPrimary/40"
        >
          <p className="text-xs uppercase tracking-wide text-textTertiary">Step 3</p>
          <h2 className="mt-1 text-base font-semibold">Refine Scope</h2>
          <p className="mt-1 text-sm text-textSecondary">Focus by topic, company, and domain risk.</p>
        </Link>
        </div>
      </section>

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
            <PreferenceOnboarding />
            <DataHorizonDivider />
            <TrustSignals
              monitoredSources={monitoredSources}
              rankedStories={articles.length}
              publishedStories={overview?.publishedArticles ?? articles.length}
              updatedAt={overview?.timestamp}
            />
            <TeamPulseRail />
            <MyBriefRail articles={articles} />
          </div>
        </div>
      )}
    </section>
  );
}
