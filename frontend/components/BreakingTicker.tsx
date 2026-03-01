"use client";

import { useEffect, useState } from "react";
import { connectNewsStream } from "@/lib/ws/news";
import { formatUtcDateTime } from "@/lib/format/date";
import { emitActivityEvent } from "@/lib/collaboration/activity";

type StreamState = "connecting" | "retrying" | "live";

const MAX_ITEMS = 8;
const RETRY_DELAY_SECONDS = 5;

export function BreakingTicker() {
  const [items, setItems] = useState<string[]>([]);
  const [streamState, setStreamState] = useState<StreamState>("connecting");
  const [retryIn, setRetryIn] = useState<number | null>(null);
  const [lastUpdateAt, setLastUpdateAt] = useState<Date | null>(null);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryInterval: ReturnType<typeof setInterval> | null = null;

    const clearReconnectTimers = () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (retryInterval) {
        clearInterval(retryInterval);
        retryInterval = null;
      }
    };

    const scheduleReconnect = () => {
      clearReconnectTimers();
      setStreamState("retrying");
      setRetryIn(RETRY_DELAY_SECONDS);

      retryInterval = setInterval(() => {
        setRetryIn((current) => {
          if (current === null || current <= 1) {
            return 0;
          }
          return current - 1;
        });
      }, 1000);

      reconnectTimeout = setTimeout(() => {
        clearReconnectTimers();
        connect();
      }, RETRY_DELAY_SECONDS * 1000);
    };

    const connect = () => {
      if (disposed) {
        return;
      }

      setStreamState("connecting");
      setRetryIn(null);
      socket = connectNewsStream({
        onOpen: () => {
          if (disposed) {
            return;
          }
          clearReconnectTimers();
          setRetryIn(null);
          setStreamState("live");
          emitActivityEvent("stream-status", "Stream connected");
        },
        onMessage: (message) => {
          if (disposed) {
            return;
          }
          setItems((current) => [message, ...current].slice(0, MAX_ITEMS));
          setLastUpdateAt(new Date());
          emitActivityEvent("news-update", message.slice(0, 120));
        },
        onClose: () => {
          if (disposed) {
            return;
          }
          scheduleReconnect();
          emitActivityEvent("stream-status", "Stream reconnecting");
        },
        onError: () => {
          socket?.close();
        }
      });
    };

    connect();

    return () => {
      disposed = true;
      clearReconnectTimers();
      socket?.close();
    };
  }, []);

  const streamText =
    streamState === "live"
      ? items.length > 0
        ? items.join("  •  ")
        : "Connected. Listening for breaking news..."
      : streamState === "retrying"
        ? `Reconnecting in ${retryIn ?? RETRY_DELAY_SECONDS}s...`
        : "Connecting to breaking news stream...";

  const stateBadgeClass =
    streamState === "live"
      ? "bg-accentDanger/20 text-accentDanger"
      : streamState === "retrying"
        ? "bg-accentPrimary/20 text-accentPrimary"
        : "bg-accentSecondary/20 text-accentSecondary";
  const stateLabel = streamState === "live" ? "LIVE" : streamState === "retrying" ? "RETRYING" : "CONNECTING";

  return (
    <div className="border-b border-borderSoft bg-bgTertiary px-4 py-2 text-xs text-textSecondary">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-hidden whitespace-nowrap">
        <span className={`rounded px-2 py-0.5 ${stateBadgeClass}`}>{stateLabel}</span>
        <div className={`min-w-0 flex-1 truncate ${streamState === "live" ? "text-textPrimary" : "text-textSecondary"}`}>
          {streamText}
        </div>
        <span className="hidden text-[11px] text-textTertiary md:inline">
          Last update: {formatUtcDateTime(lastUpdateAt, "No updates yet")}
        </span>
      </div>
    </div>
  );
}
