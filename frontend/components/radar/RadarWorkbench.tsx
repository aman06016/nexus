"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchTrending } from "@/lib/api/client";
import { useToast } from "@/components/feedback/ToastProvider";
import { formatRelativeTime, formatUtcDateTime } from "@/lib/format/date";
import { emitActivityEvent } from "@/lib/collaboration/activity";
import { ContextualEmptyState } from "@/components/empty/ContextualEmptyState";
import { toUserSafeErrorMessage } from "@/lib/errors/userMessage";
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

type RuleValidation = {
  topic?: string;
  sourceDomain?: string;
  minImpact?: string;
};

function isValidDomain(value: string): boolean {
  if (!value.trim()) {
    return true;
  }
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(value.trim());
}

function validateDraft(draft: RuleDraft): RuleValidation {
  const errors: RuleValidation = {};

  if (!draft.topic.trim()) {
    errors.topic = "Topic is required.";
  } else if (draft.topic.trim().length < 3) {
    errors.topic = "Topic should be at least 3 characters.";
  }

  if (!isValidDomain(draft.sourceDomain)) {
    errors.sourceDomain = "Use a valid domain such as example.com.";
  }

  if (!Number.isFinite(draft.minImpact) || draft.minImpact < 0 || draft.minImpact > 100) {
    errors.minImpact = "Min impact must be between 0 and 100.";
  }

  return errors;
}

export function RadarWorkbench() {
  const { notify } = useToast();
  const [draft, setDraft] = useState<RuleDraft>(DEFAULT_DRAFT);
  const [rules, setRules] = useState<IncidentRule[]>([]);
  const [alerts, setAlerts] = useState<IncidentAlertEvent[]>([]);
  const [lastDigestAt, setLastDigestState] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [runNowBusy, setRunNowBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [validation, setValidation] = useState<RuleValidation>({});

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
    const nextValidation = validateDraft(draft);
    setValidation(nextValidation);

    if (Object.keys(nextValidation).length > 0) {
      notify("Please fix validation errors before saving.", "error");
      return;
    }

    setSaveBusy(true);
    setStatusMessage(null);
    try {
      createIncidentRule({
        name: draft.name,
        topic: draft.topic,
        company: draft.company,
        sourceDomain: draft.sourceDomain,
        minImpact: Math.max(0, Math.min(100, Math.round(draft.minImpact))),
        mode: draft.mode
      });
      setDraft((current) => ({
        ...DEFAULT_DRAFT,
        topic: current.topic
      }));
      setStatusMessage("Rule saved. Monitoring started.");
      notify("Alert rule created", "success");
      emitActivityEvent("workspace-update", "Incident radar rule created");
      refreshState();
    } catch (error) {
      const message = toUserSafeErrorMessage(error, "Unable to save rule right now.");
      setStatusMessage(message);
      notify(message, "error");
    } finally {
      setSaveBusy(false);
    }
  };

  const runPreview = async () => {
    setPreviewBusy(true);
    setStatusMessage(null);
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
      setStatusMessage(`Preview complete: ${matches.length} match${matches.length === 1 ? "" : "es"} found.`);
    } catch (error) {
      const message = toUserSafeErrorMessage(error, "Unable to run preview scan.");
      setStatusMessage(message);
      notify(message, "error");
    } finally {
      setPreviewBusy(false);
    }
  };

  const runNow = async () => {
    setRunNowBusy(true);
    setStatusMessage(null);
    window.dispatchEvent(new CustomEvent(MANUAL_SCAN_EVENT));
    notify("Incident scan triggered", "info");
    setStatusMessage("Scan request queued. New alerts will appear when matching stories arrive.");
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    setRunNowBusy(false);
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
        <p aria-live="polite" className="sr-only">
          {statusMessage ?? ""}
        </p>
        {statusMessage ? <p className="mt-2 text-xs text-textSecondary">{statusMessage}</p> : null}
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
            onChange={(event) => {
              setDraft((current) => ({ ...current, topic: event.target.value }));
              setValidation((current) => ({ ...current, topic: undefined }));
            }}
            placeholder="Topic keyword (required)"
            aria-invalid={Boolean(validation.topic)}
            className={`min-h-11 rounded-md border bg-bgTertiary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring ${
              validation.topic ? "border-accentDanger" : "border-borderSoft"
            }`}
          />
          {validation.topic ? <p className="text-xs text-accentDanger">{validation.topic}</p> : null}
          <input
            value={draft.company}
            onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))}
            placeholder="Company keyword (optional)"
            className="min-h-10 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring"
          />
          <input
            value={draft.sourceDomain}
            onChange={(event) => {
              setDraft((current) => ({ ...current, sourceDomain: event.target.value }));
              setValidation((current) => ({ ...current, sourceDomain: undefined }));
            }}
            placeholder="Source domain (optional)"
            aria-invalid={Boolean(validation.sourceDomain)}
            className={`min-h-11 rounded-md border bg-bgTertiary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring ${
              validation.sourceDomain ? "border-accentDanger" : "border-borderSoft"
            }`}
          />
          {validation.sourceDomain ? (
            <p className="text-xs text-accentDanger">{validation.sourceDomain}</p>
          ) : (
            <p className="text-xs text-textTertiary">Optional. Example: anthropic.com</p>
          )}
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={draft.minImpact}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  minImpact: Number.isFinite(Number(event.target.value)) ? Number(event.target.value) : 0
                }));
                setValidation((current) => ({ ...current, minImpact: undefined }));
              }}
              aria-invalid={Boolean(validation.minImpact)}
              className={`min-h-11 rounded-md border bg-bgTertiary px-3 py-2 text-sm outline-none ring-accentPrimary transition focus:ring ${
                validation.minImpact ? "border-accentDanger" : "border-borderSoft"
              }`}
            />
            <span className="text-xs text-textSecondary">Min impact</span>
          </div>
          {validation.minImpact ? <p className="text-xs text-accentDanger">{validation.minImpact}</p> : null}
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
              disabled={saveBusy}
              className="motion-press min-h-11 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary disabled:opacity-60"
            >
              {saveBusy ? "Saving Rule..." : "Save Rule"}
            </button>
            <button
              type="button"
              disabled={runNowBusy}
              onClick={runNow}
              className="motion-press min-h-11 rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-sm font-medium text-textSecondary transition hover:bg-bgPrimary hover:text-textPrimary disabled:opacity-60"
            >
              {runNowBusy ? "Running Scan..." : "Run Scan Now"}
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
            <ContextualEmptyState
              title="No active rules yet"
              description="Create your first rule to start proactive monitoring."
              guidance={[
                "Use a template to prefill topic and threshold.",
                "Set mode to Realtime + Digest for both immediate and periodic coverage."
              ]}
              actions={[{ href: "/radar", label: "Create First Rule Above" }]}
            />
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
            <ContextualEmptyState
              title="No incident alerts yet"
              description="Alerts will appear here when live stories match your active rules."
              guidance={[
                "Run Scan Now to trigger an immediate evaluation.",
                "Lower minimum impact slightly if your topic is too narrow."
              ]}
              actions={[
                { href: "/trending", label: "Inspect Trending Topics" },
                { href: "/radar", label: "Adjust Rules Above" }
              ]}
            />
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
