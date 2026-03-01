"use client";

import { useEffect } from "react";
import { fetchArticles, fetchTrending } from "@/lib/api/client";
import { useToast } from "@/components/feedback/ToastProvider";
import { emitActivityEvent } from "@/lib/collaboration/activity";
import {
  appendIncidentAlerts,
  evaluateIncidentRules,
  filterNewIncidentMatches,
  getIncidentAlertEvents,
  getIncidentRules,
  getLastDigestAt,
  markIncidentMatchesSeen,
  RuleMatch,
  setLastDigestAt
} from "@/lib/radar/rules";

const SCAN_INTERVAL_MS = 45_000;
const DIGEST_INTERVAL_MS = 10 * 60 * 1000;
const MANUAL_SCAN_EVENT = "nexus:radar:scan-now";

function dedupeArticles<T extends { id: string }>(items: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of items) {
    if (!item?.id || byId.has(item.id)) {
      continue;
    }
    byId.set(item.id, item);
  }
  return [...byId.values()];
}

function summarizeRealtime(matches: RuleMatch[]): string[] {
  const previews = matches.slice(0, 2).map((match) => `${match.rule.name}: ${match.article.title}`);
  if (matches.length > 2) {
    previews.push(`+${matches.length - 2} more incidents`);
  }
  return previews;
}

export function IncidentRadarEngine() {
  const { notify } = useToast();

  useEffect(() => {
    let canceled = false;
    let inflight = false;

    const scan = async (manual = false) => {
      if (inflight) {
        return;
      }

      const rules = getIncidentRules().filter((rule) => rule.enabled);
      if (rules.length === 0) {
        return;
      }

      inflight = true;
      try {
        const [latest, trending] = await Promise.all([
          fetchArticles(0, 30).catch(() => []),
          fetchTrending(0, 30).catch(() => [])
        ]);

        if (canceled) {
          return;
        }

        const pool = dedupeArticles([...trending, ...latest]);
        const matches = evaluateIncidentRules(rules, pool);
        const freshMatches = filterNewIncidentMatches(matches);

        if (freshMatches.length > 0) {
          appendIncidentAlerts(freshMatches);
          markIncidentMatchesSeen(freshMatches);

          const realtimeMatches = freshMatches.filter(
            (match) => match.rule.mode === "realtime" || match.rule.mode === "both"
          );

          for (const line of summarizeRealtime(realtimeMatches)) {
            notify(line, "info");
          }

          if (realtimeMatches.length > 0) {
            emitActivityEvent("workspace-update", `${realtimeMatches.length} incident alerts triggered`);
          }
        }

        const lastDigestAt = getLastDigestAt();
        const lastDigestMs = lastDigestAt ? Number(new Date(lastDigestAt)) : 0;
        const now = Date.now();
        const dueDigest = manual || now - lastDigestMs >= DIGEST_INTERVAL_MS;

        if (dueDigest) {
          const digestEligibleRuleIds = new Set(
            rules
              .filter((rule) => rule.mode === "digest" || rule.mode === "both")
              .map((rule) => rule.id)
          );

          const pendingDigest = getIncidentAlertEvents(140).filter((event) => {
            if (!digestEligibleRuleIds.has(event.ruleId)) {
              return false;
            }
            const createdMs = Number(new Date(event.createdAt));
            return Number.isFinite(createdMs) && createdMs > lastDigestMs;
          });

          if (pendingDigest.length > 0) {
            const byRule = new Map<string, number>();
            for (const event of pendingDigest) {
              byRule.set(event.ruleName, (byRule.get(event.ruleName) ?? 0) + 1);
            }
            const topRule = [...byRule.entries()].sort((a, b) => b[1] - a[1])[0];
            notify(
              `Incident digest: ${pendingDigest.length} new matches. Top rule: ${topRule?.[0] ?? "Mixed"}.`,
              "success"
            );
            emitActivityEvent("workspace-update", `Incident digest generated (${pendingDigest.length} matches)`);
          }

          setLastDigestAt(new Date().toISOString());
        }
      } finally {
        inflight = false;
      }
    };

    scan();
    const interval = window.setInterval(() => scan(), SCAN_INTERVAL_MS);
    const onManualScan = () => scan(true);
    window.addEventListener(MANUAL_SCAN_EVENT, onManualScan);

    return () => {
      canceled = true;
      window.clearInterval(interval);
      window.removeEventListener(MANUAL_SCAN_EVENT, onManualScan);
    };
  }, [notify]);

  return null;
}
