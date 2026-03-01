"use client";

import { useEffect } from "react";
import { fetchArticles, fetchTrending } from "@/lib/api/client";
import { useToast } from "@/components/feedback/ToastProvider";
import { emitActivityEvent } from "@/lib/collaboration/activity";
import {
  appendShockwaveAlerts,
  detectShockwaves,
  filterNewShockwaves,
  markShockwavesSeen
} from "@/lib/radar/shockwave";

const SCAN_INTERVAL_MS = 35_000;

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

export function EventShockwaveEngine() {
  const { notify } = useToast();

  useEffect(() => {
    let canceled = false;
    let inflight = false;

    const scan = async () => {
      if (inflight) {
        return;
      }

      inflight = true;
      try {
        const [latest, trending] = await Promise.all([
          fetchArticles(0, 36).catch(() => []),
          fetchTrending(0, 36).catch(() => [])
        ]);

        if (canceled) {
          return;
        }

        const pool = dedupeArticles([...trending, ...latest]);
        const detected = detectShockwaves(pool);
        const fresh = filterNewShockwaves(detected);
        if (fresh.length > 0) {
          appendShockwaveAlerts(fresh);
          markShockwavesSeen(fresh);
          for (const alert of fresh.slice(0, 2)) {
            notify(`Shockwave: ${alert.topic} (${alert.sourceCount} sources)`, "info");
          }
          emitActivityEvent("workspace-update", `${fresh.length} shockwave alert${fresh.length === 1 ? "" : "s"} detected`);
        }
      } finally {
        inflight = false;
      }
    };

    scan();
    const interval = window.setInterval(() => scan(), SCAN_INTERVAL_MS);
    return () => {
      canceled = true;
      window.clearInterval(interval);
    };
  }, [notify]);

  return null;
}

