"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminOverview,
  fetchAdminOverview,
  pauseAdminSource,
  rescrapeAdminSource,
  resumeAdminSource,
  triggerAdminScrapeRun,
  triggerAdminTrendingRecompute
} from "@/lib/api/client";
import { formatUtcDateTime } from "@/lib/format/date";
import { useToast } from "@/components/feedback/ToastProvider";
import { emitActivityEvent } from "@/lib/collaboration/activity";

type ActionState = {
  runningScrape: boolean;
  runningTrending: boolean;
  sourceBusy: Record<string, "pause" | "resume" | "refresh" | null>;
  sourceStatus: Record<string, string>;
};

export default function AdminPage() {
  const { notify } = useToast();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [sourceQuery, setSourceQuery] = useState("");
  const [actions, setActions] = useState<ActionState>({
    runningScrape: false,
    runningTrending: false,
    sourceBusy: {},
    sourceStatus: {}
  });

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminOverview();
      setOverview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const filteredSources = overview?.sources.filter((source) => {
    const normalized = sourceQuery.trim().toLowerCase();
    if (!normalized) {
      return true;
    }
    return `${source.name} ${source.domain ?? ""} ${source.status}`.toLowerCase().includes(normalized);
  });

  const runScrape = async () => {
    setStatusMessage(null);
    setActions((prev) => ({ ...prev, runningScrape: true }));
    try {
      const result = await triggerAdminScrapeRun();
      setStatusMessage(`Scrape cycle completed. Active sources processed: ${result.activeSourcesProcessed ?? 0}`);
      notify("Scrape cycle completed", "success");
      emitActivityEvent("admin-action", "Scrape cycle completed");
      await loadOverview();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to run scrape cycle";
      setStatusMessage(message);
      notify(message, "error");
    } finally {
      setActions((prev) => ({ ...prev, runningScrape: false }));
    }
  };

  const runTrending = async () => {
    setStatusMessage(null);
    setActions((prev) => ({ ...prev, runningTrending: true }));
    try {
      const result = await triggerAdminTrendingRecompute();
      setStatusMessage(`Trending recompute finished. Updated articles: ${result.updatedArticles ?? 0}`);
      notify("Trending recompute completed", "success");
      emitActivityEvent("admin-action", "Trending recompute completed");
      await loadOverview();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to recompute trending";
      setStatusMessage(message);
      notify(message, "error");
    } finally {
      setActions((prev) => ({ ...prev, runningTrending: false }));
    }
  };

  const withSourceAction = async (
    sourceId: string,
    actionType: "pause" | "resume" | "refresh",
    action: () => Promise<void>
  ) => {
    setStatusMessage(null);
    setActions((prev) => ({
      ...prev,
      sourceBusy: { ...prev.sourceBusy, [sourceId]: actionType },
      sourceStatus: {
        ...prev.sourceStatus,
        [sourceId]:
          actionType === "pause"
            ? "Pausing source..."
            : actionType === "resume"
              ? "Resuming source..."
              : "Refreshing source..."
      }
    }));
    try {
      await action();
      notify("Source action applied", "success");
      emitActivityEvent("admin-action", `Source ${actionType} applied`);
      setActions((prev) => ({
        ...prev,
        sourceStatus: { ...prev.sourceStatus, [sourceId]: `Updated ${formatUtcDateTime(new Date(), "just now")} UTC` }
      }));
      await loadOverview();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Source update failed";
      setStatusMessage(message);
      notify(message, "error");
      setActions((prev) => ({
        ...prev,
        sourceStatus: { ...prev.sourceStatus, [sourceId]: message }
      }));
    } finally {
      setActions((prev) => ({
        ...prev,
        sourceBusy: { ...prev.sourceBusy, [sourceId]: null }
      }));
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-textSecondary">Operational dashboard for scrape, trend recompute, and source controls.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={runScrape}
          disabled={actions.runningScrape}
          className="motion-press min-h-11 rounded-md border border-borderSoft bg-bgSecondary px-4 py-3 text-sm font-medium text-textSecondary transition hover:bg-bgTertiary hover:text-textPrimary disabled:opacity-60"
        >
          {actions.runningScrape ? "Running scrape cycle..." : "Run Scrape Cycle"}
        </button>
        <button
          type="button"
          onClick={runTrending}
          disabled={actions.runningTrending}
          className="motion-press min-h-11 rounded-md border border-borderSoft bg-bgSecondary px-4 py-3 text-sm font-medium text-textSecondary transition hover:bg-bgTertiary hover:text-textPrimary disabled:opacity-60"
        >
          {actions.runningTrending ? "Recomputing trending..." : "Recompute Trending"}
        </button>
      </div>

      {statusMessage ? <p className="text-sm text-textSecondary">{statusMessage}</p> : null}
      {error ? <p className="text-sm text-accentDanger">{error}</p> : null}

      {loading ? (
        <section className="rounded-card border border-borderSoft bg-bgSecondary p-6 text-textSecondary">
          Loading admin overview...
        </section>
      ) : overview ? (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <MetricCard label="Total Articles" value={overview.totalArticles} />
            <MetricCard label="Published" value={overview.publishedArticles} />
            <MetricCard label="Sources" value={overview.totalSources} />
            <MetricCard label="Active Sources" value={overview.activeSources} />
            <MetricCard label="Paused Sources" value={overview.pausedSources} />
          </section>

          <section className="rounded-card border border-borderSoft bg-bgSecondary p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Advanced Source Controls</h2>
                <p className="mt-1 text-sm text-textSecondary">
                  Keep primary operations simple; use this when you need source-level intervention.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-textSecondary">Updated: {formatUtcDateTime(overview.timestamp)}</span>
                <button
                  type="button"
                  onClick={() => setShowAdvancedControls((current) => !current)}
                  className="motion-press min-h-9 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
                  aria-expanded={showAdvancedControls}
                  aria-controls="advanced-source-controls"
                >
                  {showAdvancedControls ? "Hide Controls" : "Show Controls"}
                </button>
              </div>
            </div>

            {!showAdvancedControls ? (
              <p className="mt-3 text-sm text-textSecondary">
                Source-level pause/resume/refresh actions are hidden by default to reduce accidental operations.
              </p>
            ) : (
              <div id="advanced-source-controls" className="mt-4 space-y-3">
                <input
                  value={sourceQuery}
                  onChange={(event) => setSourceQuery(event.target.value)}
                  placeholder="Filter sources by name, domain, or status..."
                  className="min-h-10 w-full rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring"
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-textSecondary">
                      <tr>
                        <th className="pb-2">Source</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Tier</th>
                        <th className="pb-2">Last Success</th>
                        <th className="pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSources?.map((source) => {
                        const busyAction = actions.sourceBusy[source.id];
                        const busy = !!busyAction;
                        const isActive = source.status === "ACTIVE";
                        const toggleLabel = isActive ? "Pause" : "Resume";
                        const toggleAction = isActive ? "pause" : "resume";
                        return (
                          <tr key={source.id} className="border-t border-borderSoft/60 align-top transition hover:bg-bgTertiary/40">
                            <td className="py-3">
                              <div className="font-medium text-textPrimary">{source.name}</div>
                              <div className="text-xs text-textSecondary">{source.domain}</div>
                            </td>
                            <td className="py-3 text-textSecondary">{source.status}</td>
                            <td className="py-3 text-textSecondary">{source.tier ?? "-"}</td>
                            <td className="py-3 text-textSecondary">
                              {formatUtcDateTime(source.lastSuccess)}
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    withSourceAction(source.id, toggleAction, () =>
                                      isActive ? pauseAdminSource(source.id) : resumeAdminSource(source.id)
                                    )
                                  }
                                  className="motion-press min-h-9 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary disabled:opacity-60"
                                >
                                  {busyAction === toggleAction ? `${toggleLabel}...` : toggleLabel}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => withSourceAction(source.id, "refresh", () => rescrapeAdminSource(source.id))}
                                  className="motion-press min-h-9 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary disabled:opacity-60"
                                >
                                  {busyAction === "refresh" ? "Refreshing..." : "Refresh Success"}
                                </button>
                              </div>
                              {actions.sourceStatus[source.id] ? (
                                <p className="mt-2 text-xs text-textSecondary">{actions.sourceStatus[source.id]}</p>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredSources && filteredSources.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-sm text-textSecondary">
                            No sources match this filter.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-borderSoft bg-bgSecondary p-4">
      <p className="text-xs text-textSecondary">{label}</p>
      <p className="mt-1 text-xl font-semibold text-textPrimary">{value}</p>
    </div>
  );
}
