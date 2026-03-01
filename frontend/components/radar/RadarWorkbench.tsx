"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchTrending } from "@/lib/api/client";
import { useToast } from "@/components/feedback/ToastProvider";
import { formatRelativeTime, formatUtcDateTime } from "@/lib/format/date";
import { emitActivityEvent } from "@/lib/collaboration/activity";
import {
  AlertDeliveryMode,
  createIncidentRule,
  deleteIncidentRule,
  evaluateIncidentRules,
  getIncidentAlertEvents,
  getIncidentRuleTemplates,
  getIncidentRules,
  getLastDigestAt,
  IncidentAlertEvent,
  IncidentRule,
  subscribeIncidentRadar,
  toggleIncidentRule
} from "@/lib/radar/rules";

const MANUAL_SCAN_EVENT = "nexus:radar:scan-now";

type RuleDraft = {
  name: string;
  topic: string;
  company: string;
  sourceDomain: string;
  minImpact: number;
  mode: AlertDeliveryMode;
};

const DEFAULT_DRAFT: RuleDraft = {
  name: "",
  topic: "cybersecurity",
  company: "",
  sourceDomain: "",
  minImpact: 65,
  mode: "both"
};

export function RadarWorkbench() {
  const { notify } = useToast();
  const [draft, setDraft] = useState<RuleDraft>(DEFAULT_DRAFT);
  const [rules, setRules] = useState<IncidentRule[]>([]);
  const [alerts, setAlerts] = useState<IncidentAlertEvent[]>([]);
  const [lastDigestAt, setLastDigestState] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const refreshState = () => {
    setRules(getIncidentRules());
    setAlerts(getIncidentAlertEvents(24));
    setLastDigestState(getLastDigestAt());
  };

  useEffect(() => {
    refreshState();
    return subscribeIncidentRadar(refreshState);
  }, []);

  const enabledCount = useMemo(() => rules.filter((rule) => rule.enabled).length, [rules]);

  const createRule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.topic.trim()) {
      notify("Topic is required", "error");
      return;
    }

    createIncidentRule({
      name: draft.name,
      topic: draft.topic,
      company: draft.company,
      sourceDomain: draft.sourceDomain,
      minImpact: draft.minImpact,
      mode: draft.mode
    });
    setDraft((current) => ({
      ...DEFAULT_DRAFT,
      topic: current.topic
    }));
    notify("Alert rule created", "success");
    emitActivityEvent("workspace-update", "Incident radar rule created");
    refreshState();
  };

  const runPreview = async () => {
    setPreviewBusy(true);
    try {
      const previewRules = getIncidentRules().filter((rule) => rule.enabled);
      if (previewRules.length === 0) {
        setPreviewCount(0);
        notify("No active rules to test", "info");
        return;
      }
      const articles = await fetchTrending(0, 30).catch(() => []);
      const matches = evaluateIncidentRules(previewRules, articles);
      setPreviewCount(matches.length);
      notify(`Preview scan found ${matches.length} matches`, matches.length > 0 ? "success" : "info");
    } finally {
      setPreviewBusy(false);
    }
  };

  const runNow = () => {
    window.dispatchEvent(new CustomEvent(MANUAL_SCAN_EVENT));
    notify("Incident scan triggered", "info");
  };

  return (
    <section className="space-y-6">
      <div className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h1 className="text-2xl font-semibold">Incident Radar</h1>
        <p className="mt-2 text-textSecondary">
          Build alert rules that transform feed updates into active monitoring workflows.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-textSecondary">
          <span className="rounded-md border border-borderSoft bg-bgTertiary px-2 py-1">
            Rules: {rules.length}
          </span>
          <span className="rounded-md border border-borderSoft bg-bgTertiary px-2 py-1">
            Active: {enabledCount}
          </span>
          <span className="rounded-md border border-borderSoft bg-bgTertiary px-2 py-1">
            Last digest: {formatUtcDateTime(lastDigestAt, "Never")}
          </span>
          {previewCount !== null ? (
            <span className="rounded-md border border-borderSoft bg-bgTertiary px-2 py-1">
              Preview matches: {previewCount}
            </span>
          ) : null}
        </div>
      </div>

      <section className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h2 className="text-lg font-semibold">New Alert Rule</h2>
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={createRule}>
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="Rule name (optional)"
            className="min-h-10 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring"
          />
          <input
            value={draft.topic}
            onChange={(event) => setDraft((current) => ({ ...current, topic: event.target.value }))}
            placeholder="Topic keyword (required)"
            className="min-h-10 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring"
          />
          <input
            value={draft.company}
            onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))}
            placeholder="Company keyword (optional)"
            className="min-h-10 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring"
          />
          <input
            value={draft.sourceDomain}
            onChange={(event) => setDraft((current) => ({ ...current, sourceDomain: event.target.value }))}
            placeholder="Source domain (optional)"
            className="min-h-10 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring"
          />
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={draft.minImpact}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  minImpact: Number.isFinite(Number(event.target.value)) ? Number(event.target.value) : 0
                }))
              }
              className="min-h-10 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring"
            />
            <span className="text-xs text-textSecondary">Min impact</span>
          </div>
          <select
            value={draft.mode}
            onChange={(event) => setDraft((current) => ({ ...current, mode: event.target.value as AlertDeliveryMode }))}
            className="min-h-10 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring"
          >
            <option value="both">Realtime + Digest</option>
            <option value="realtime">Realtime only</option>
            <option value="digest">Digest only</option>
          </select>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button
              type="submit"
              className="motion-press min-h-10 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
            >
              Save Rule
            </button>
            <button
              type="button"
              onClick={runNow}
              className="motion-press min-h-10 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
            >
              Run Scan Now
            </button>
            <button
              type="button"
              disabled={previewBusy}
              onClick={runPreview}
              className="motion-press min-h-10 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary disabled:opacity-60"
            >
              {previewBusy ? "Testing..." : "Test Against Trending"}
            </button>
          </div>
        </form>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-textTertiary">Quick templates</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {getIncidentRuleTemplates().map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() =>
                  setDraft({
                    name: template.name,
                    topic: template.topic,
                    company: template.company ?? "",
                    sourceDomain: "",
                    minImpact: template.minImpact,
                    mode: template.mode
                  })
                }
                className="motion-press rounded-md border border-borderSoft bg-bgTertiary px-2.5 py-1.5 text-xs text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h2 className="text-lg font-semibold">Active Rules</h2>
        <div className="mt-3 space-y-2">
          {rules.length === 0 ? (
            <p className="text-sm text-textSecondary">No rules configured yet.</p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="rounded-md border border-borderSoft bg-bgTertiary/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-textPrimary">{rule.name}</p>
                    <p className="mt-1 text-xs text-textSecondary">
                      if topic includes "{rule.topic}"{rule.company ? ` and company includes "${rule.company}"` : ""}
                      {rule.sourceDomain ? ` and source includes "${rule.sourceDomain}"` : ""} and impact &gt;=
                      {" "}
                      {rule.minImpact}
                    </p>
                    <p className="mt-1 text-[11px] text-textTertiary">
                      Mode: {rule.mode} • Updated {formatRelativeTime(rule.updatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        toggleIncidentRule(rule.id, !rule.enabled);
                        refreshState();
                      }}
                      className={`motion-press rounded-md border px-2.5 py-1 text-xs transition ${
                        rule.enabled
                          ? "border-accentSuccess/50 bg-accentSuccess/10 text-accentSuccess"
                          : "border-borderSoft bg-bgPrimary text-textSecondary"
                      }`}
                    >
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteIncidentRule(rule.id);
                        refreshState();
                        notify("Rule deleted", "info");
                      }}
                      className="motion-press rounded-md border border-borderSoft bg-bgPrimary px-2.5 py-1 text-xs text-textSecondary transition hover:text-textPrimary"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-card border border-borderSoft bg-bgSecondary p-6">
        <h2 className="text-lg font-semibold">Recent Incident Alerts</h2>
        <div className="mt-3 space-y-2">
          {alerts.length === 0 ? (
            <p className="text-sm text-textSecondary">No incident alerts yet.</p>
          ) : (
            alerts.map((alert) => (
              <article key={alert.id} className="rounded-md border border-borderSoft bg-bgTertiary/70 p-3">
                <p className="text-sm font-medium text-textPrimary">{alert.articleTitle}</p>
                <p className="mt-1 text-xs text-textSecondary">
                  Rule: {alert.ruleName} • Impact {alert.impactScore} • {alert.sourceName}
                </p>
                <p className="mt-1 text-[11px] text-textTertiary">
                  {alert.reasons.join(" · ")} • {formatRelativeTime(alert.createdAt)}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
