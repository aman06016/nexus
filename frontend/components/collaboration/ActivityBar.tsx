"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getOrCreateSessionId } from "@/lib/session/session";
import {
  ActivityEvent,
  getLastActivityEvent,
  subscribeActivityEvents
} from "@/lib/collaboration/activity";
import { PresenceSnapshot, watchPresence } from "@/lib/collaboration/presence";
import { formatRelativeTime, formatUtcDateTime } from "@/lib/format/date";

type ActivityBarProps = {
  scopeId?: string;
  scopeLabel?: string;
};

const EVENT_LABELS: Record<ActivityEvent["type"], string> = {
  "news-update": "News stream update",
  "stream-status": "Stream status changed",
  "admin-action": "Admin operation",
  "workspace-update": "Workspace update",
  "page-refresh": "Page refresh"
};

export function ActivityBar({ scopeId = "global", scopeLabel = "Global Workspace" }: ActivityBarProps) {
  const pathname = usePathname();
  const [presence, setPresence] = useState<PresenceSnapshot>({ activeSessions: 1, activeTabs: 1 });
  const [lastEvent, setLastEvent] = useState<ActivityEvent | null>(null);
  const [relativeNow, setRelativeNow] = useState(0);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    return watchPresence(scopeId, sessionId, setPresence);
  }, [scopeId]);

  useEffect(() => {
    setLastEvent(getLastActivityEvent());
    return subscribeActivityEvents((event) => setLastEvent(event));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setRelativeNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  const eventText = useMemo(() => {
    if (!lastEvent) {
      return "No activity recorded yet";
    }
    return `${EVENT_LABELS[lastEvent.type]} ${formatRelativeTime(lastEvent.at)}`;
  }, [lastEvent, relativeNow]);

  return (
    <div className="pointer-events-none border-b border-borderSoft bg-bgPrimary/70 px-4 py-2 text-xs text-textSecondary">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
        <span className="rounded-full border border-borderSoft bg-bgSecondary px-2 py-0.5 text-[11px] text-textPrimary">
          {scopeLabel}
        </span>
        <span className="rounded-full border border-borderSoft bg-bgSecondary px-2 py-0.5 text-[11px]">
          {presence.activeSessions} active session{presence.activeSessions === 1 ? "" : "s"}
        </span>
        <span className="rounded-full border border-borderSoft bg-bgSecondary px-2 py-0.5 text-[11px]">
          {presence.activeTabs} open tab{presence.activeTabs === 1 ? "" : "s"}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] text-textSecondary">{eventText}</span>
        <span className="text-[11px] text-textTertiary">
          Route: {pathname} | Updated: {formatUtcDateTime(lastEvent?.at, "Never")}
        </span>
      </div>
    </div>
  );
}
