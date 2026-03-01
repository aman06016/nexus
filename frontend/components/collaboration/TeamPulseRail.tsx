"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/format/date";
import { getTeamWatchlist, subscribeTeamPulse, TeamWatchlistEntry } from "@/lib/collaboration/teamPulse";

type TeamPulseRailProps = {
  scopeId?: string;
};

export function TeamPulseRail({ scopeId = "global" }: TeamPulseRailProps) {
  const [entries, setEntries] = useState<TeamWatchlistEntry[]>([]);

  useEffect(() => {
    const refresh = () => setEntries(getTeamWatchlist(scopeId, 8));
    refresh();
    return subscribeTeamPulse(refresh);
  }, [scopeId]);

  return (
    <aside className="rounded-card border border-borderSoft bg-bgSecondary p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-textPrimary">Team Pulse</h3>
        <span className="rounded-full border border-borderSoft bg-bgTertiary px-2.5 py-1 text-[11px] text-textSecondary">
          Shared watchlist
        </span>
      </div>
      <p className="mt-1 text-xs text-textSecondary">
        See what teammates are monitoring and where consensus is shifting.
      </p>

      <div className="mt-3 space-y-2">
        {entries.length === 0 ? (
          <section className="empty-calm-field rounded-md border border-borderSoft bg-bgTertiary/70 px-3 py-3">
            <div className="calm-orb calm-orb-a" aria-hidden="true" />
            <div className="calm-orb calm-orb-c" aria-hidden="true" />
            <p className="text-xs text-textSecondary">Team pulse is calm.</p>
            <p className="mt-1 text-[11px] text-textTertiary">
              First Watch, Debunk, or Escalate reaction will seed shared momentum.
            </p>
          </section>
        ) : (
          entries.map((entry) => (
            <article key={entry.articleId} className="rounded-md border border-borderSoft bg-bgTertiary/70 p-2.5">
              <p className="line-clamp-2 text-xs font-medium text-textPrimary">{entry.articleTitle}</p>
              <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-textSecondary">
                <span>Watch {entry.watchCount}</span>
                <span>•</span>
                <span>Debunk {entry.debunkCount}</span>
                <span>•</span>
                <span>Escalate {entry.escalateCount}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full border border-borderSoft bg-bgPrimary px-2 py-0.5 text-textSecondary">
                  Heat {Math.round(entry.score)}
                </span>
                <span className="rounded-full border border-borderSoft bg-bgPrimary px-2 py-0.5 text-textSecondary">
                  {entry.shift === "up" ? "Consensus rising" : entry.shift === "down" ? "Consensus softening" : "Consensus stable"}
                </span>
                <span className="text-textTertiary">{formatRelativeTime(entry.lastActivityAt)}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
