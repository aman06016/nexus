import { fetchAdminOverview, fetchArticles } from "@/lib/api/client";
import Link from "next/link";
import type { CSSProperties } from "react";
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
  const signalCoreStyle = {
    "--signal-velocity": liveVelocity.toFixed(2),
    "--orbit-duration": `${(9 - liveVelocity * 4.5).toFixed(2)}s`,
    "--burst-duration": `${(4.8 - liveVelocity * 2).toFixed(2)}s`,
    "--pulse-duration": `${(3 - liveVelocity).toFixed(2)}s`
  } as CSSProperties;

  return (
    <section className="space-y-6">
      <section className="hero-shell rounded-card p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
          <div>
            <p className="inline-flex rounded-full border border-accentSecondary/35 bg-accentSecondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accentSecondary">
              Real-Time Intelligence
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Separate signal from AI noise before it hits your roadmap.
            </h1>
            <p className="mt-3 max-w-2xl text-base text-textSecondary">
              NEXUS ranks verified coverage by impact, freshness, and source quality so your team acts
              on decisive stories faster.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/trending"
                className="motion-press rounded-md border border-accentPrimary/50 bg-accentPrimary/20 px-4 py-2.5 text-sm font-semibold text-accentPrimary transition hover:bg-accentPrimary/30"
              >
                Open Top Signals
              </Link>
              <Link
                href="/search?q=agentic%20ai"
                className="motion-press rounded-md border border-borderSoft bg-bgSecondary/80 px-4 py-2.5 text-sm font-medium text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
              >
                Explore Agentic AI
              </Link>
            </div>
          </div>
          <div className="signal-core-shell relative overflow-hidden rounded-2xl border border-borderSoft/80 p-4" style={signalCoreStyle}>
            <div className="signal-core-stage" aria-hidden="true">
              <div className="signal-core-glow" />
              <div className="signal-core-orb">
                <span className="signal-core-ring signal-core-ring-a" />
                <span className="signal-core-ring signal-core-ring-b" />
                <span className="signal-core-ring signal-core-ring-c" />
                <span className="signal-core-filament signal-core-filament-a" />
                <span className="signal-core-filament signal-core-filament-b" />
                <span className="signal-core-filament signal-core-filament-c" />
                <span className="signal-core-particle signal-core-particle-a" />
                <span className="signal-core-particle signal-core-particle-b" />
                <span className="signal-core-particle signal-core-particle-c" />
              </div>
            </div>
            <div className="relative z-10 mt-52 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-borderSoft bg-bgPrimary/70 p-2.5">
                <p className="text-[11px] text-textTertiary">Signal Velocity</p>
                <p className="mt-1 text-lg font-semibold text-accentSecondary">{Math.round(liveVelocity * 100)}%</p>
              </div>
              <div className="rounded-xl border border-borderSoft bg-bgPrimary/70 p-2.5">
                <p className="text-[11px] text-textTertiary">Fresh in 24h</p>
                <p className="mt-1 text-lg font-semibold text-textPrimary">{freshCount}</p>
              </div>
              <div className="rounded-xl border border-borderSoft bg-bgPrimary/70 p-2.5">
                <p className="text-[11px] text-textTertiary">Primary Signals</p>
                <p className="mt-1 text-lg font-semibold text-textPrimary">{primaryCount}</p>
              </div>
              <div className="rounded-xl border border-borderSoft bg-bgPrimary/70 p-2.5">
                <p className="text-[11px] text-textTertiary">Tracked Sources</p>
                <p className="mt-1 text-lg font-semibold text-textPrimary">{monitoredSources}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-card border border-borderSoft bg-bgSecondary/60 p-4 md:grid-cols-3">
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
            <PreferenceOnboarding />
          </div>
          <div className="space-y-6">
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
