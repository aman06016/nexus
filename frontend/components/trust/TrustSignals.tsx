"use client";

import { useEffect, useState } from "react";
import { getOrCreateSessionId } from "@/lib/session/session";
import { PresenceSnapshot, watchPresence } from "@/lib/collaboration/presence";
import { formatRelativeTime, formatUtcDateTime } from "@/lib/format/date";

type TrustSignalsProps = {
  monitoredSources: number;
  rankedStories: number;
  publishedStories: number;
  updatedAt?: string;
};

export function TrustSignals({
  monitoredSources,
  rankedStories,
  publishedStories,
  updatedAt
}: TrustSignalsProps) {
  const [presence, setPresence] = useState<PresenceSnapshot>({ activeSessions: 1, activeTabs: 1 });

  useEffect(() => {
    return watchPresence("global", getOrCreateSessionId(), setPresence);
  }, []);

  return (
    <section className="rounded-card border border-borderSoft bg-bgSecondary p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-textPrimary">Trust and Coverage Signals</h2>
        <span className="rounded-full border border-borderSoft bg-bgTertiary px-2.5 py-1 text-xs text-textSecondary">
          {presence.activeSessions} analysts active now
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
        <div className="rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary">
          Monitored sources: <span className="font-semibold text-textPrimary">{monitoredSources}</span>
        </div>
        <div className="rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary">
          Ranked stories: <span className="font-semibold text-textPrimary">{rankedStories}</span>
        </div>
        <div className="rounded-md border border-borderSoft bg-bgTertiary px-3 py-2 text-textSecondary">
          Published inventory: <span className="font-semibold text-textPrimary">{publishedStories}</span>
        </div>
      </div>

      <p className="mt-2 text-xs text-textTertiary">
        Coverage refreshed: {formatUtcDateTime(updatedAt, "Unknown")} ({formatRelativeTime(updatedAt, "just now")})
      </p>
    </section>
  );
}
