"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getOrCreateSessionId } from "@/lib/session/session";
import { PresenceSnapshot, watchPresence } from "@/lib/collaboration/presence";
import { formatUtcDateTime } from "@/lib/format/date";
import { getStreamHealthSnapshot, subscribeStreamHealth } from "@/lib/ws/streamHealth";
import { getShockwaveAlerts, subscribeShockwaveAlerts } from "@/lib/radar/shockwave";

type CommandCenterStripProps = {
  liveVelocity: number;
  monitoredSources: number;
};

function usePulseOnChange(value: string) {
  const previous = useRef(value);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (previous.current === value) {
      return;
    }
    previous.current = value;
    setPulse(true);
    const timer = window.setTimeout(() => setPulse(false), 980);
    return () => window.clearTimeout(timer);
  }, [value]);

  return pulse;
}

export function CommandCenterStrip({ liveVelocity, monitoredSources }: CommandCenterStripProps) {
  const [presence, setPresence] = useState<PresenceSnapshot>({ activeSessions: 1, activeTabs: 1 });
  const [streamTick, setStreamTick] = useState(0);
  const [shockwaveCount, setShockwaveCount] = useState(0);

  useEffect(() => watchPresence("global", getOrCreateSessionId(), setPresence), []);
  useEffect(() => subscribeStreamHealth(() => setStreamTick((value) => value + 1)), []);
  useEffect(() => {
    const refresh = () => setShockwaveCount(getShockwaveAlerts(6).length);
    refresh();
    return subscribeShockwaveAlerts(refresh);
  }, []);

  const stream = useMemo(() => getStreamHealthSnapshot(), [streamTick]);
  const velocityLabel = `${Math.round(liveVelocity * 100)}%`;
  const streamLabel = stream.isPaused ? "Feed paused" : stream.connected ? "Live stream" : "Reconnecting";
  const shockwaveLabel = shockwaveCount > 0 ? `${shockwaveCount} active` : "No active alerts";
  const lastSeen = formatUtcDateTime(stream.lastSuccessfulUpdateAt, "Awaiting first update");

  const pulseVelocity = usePulseOnChange(velocityLabel);
  const pulseStream = usePulseOnChange(`${streamLabel}:${lastSeen}`);
  const pulseShockwave = usePulseOnChange(shockwaveLabel);

  return (
    <section className="command-center-strip sticky z-30 rounded-xl border border-borderSoft/70 px-3 py-2 md:top-20">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`status-chip ${pulseVelocity ? "status-chip-breathe" : ""}`}>
          Velocity {velocityLabel}
        </span>
        <span className="status-chip">Sources {monitoredSources}</span>
        <span className={`status-chip ${pulseStream ? "status-chip-breathe" : ""}`}>{streamLabel}</span>
        <span className={`status-chip ${pulseShockwave ? "status-chip-breathe" : ""}`}>
          Shockwave {shockwaveLabel}
        </span>
        <span className="ml-auto text-[11px] text-textTertiary">Last update {lastSeen}</span>
        <span className="status-chip text-[11px]">Analysts {presence.activeSessions}</span>
      </div>
    </section>
  );
}
