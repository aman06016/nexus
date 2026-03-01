"use client";

import { useEffect, useState } from "react";
import { connectNewsStream } from "@/lib/ws/news";
import { emitActivityEvent } from "@/lib/collaboration/activity";
import { shouldSuppressRealtime } from "@/lib/runtime/realtime";
import {
  getStreamHealthSnapshot,
  recordStreamConnected,
  recordStreamConnecting,
  recordStreamDisconnected,
  recordStreamMessage,
  recordStreamRetrying,
  subscribeStreamHealth
} from "@/lib/ws/streamHealth";

type StreamState = "connecting" | "retrying" | "live";

const MAX_ITEMS = 8;
const RETRY_DELAY_SECONDS = 5;

export function BreakingTicker() {
  const [items, setItems] = useState<string[]>([]);
  const [streamState, setStreamState] = useState<StreamState>("connecting");
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  const [healthTick, setHealthTick] = useState(0);
  const [realtimeSuppressed, setRealtimeSuppressed] = useState(false);

  useEffect(() => subscribeStreamHealth(() => setHealthTick((current) => current + 1)), []);
  useEffect(() => {
    setRealtimeSuppressed(shouldSuppressRealtime());
  }, []);

  useEffect(() => {
    if (realtimeSuppressed) {
      return;
    }
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
      recordStreamRetrying();

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
      recordStreamConnecting();
      socket = connectNewsStream({
        onOpen: () => {
          if (disposed) {
            return;
          }
          clearReconnectTimers();
          setStreamState("live");
          setHasConnectedOnce(true);
          recordStreamConnected();
          emitActivityEvent("stream-status", "Stream connected");
        },
        onMessage: (message) => {
          if (disposed) {
            return;
          }
          setItems((current) => [message, ...current].slice(0, MAX_ITEMS));
          recordStreamMessage();
          emitActivityEvent("news-update", message.slice(0, 120));
        },
        onClose: () => {
          if (disposed) {
            return;
          }
          recordStreamDisconnected();
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
  }, [realtimeSuppressed]);

  if (realtimeSuppressed) {
    return null;
  }

  void healthTick;
  const snapshot = getStreamHealthSnapshot();
  const pausedState =
    snapshot.isPaused && snapshot.lastSuccessfulUpdateAt
      ? `Live paused · last successful update at ${new Date(snapshot.lastSuccessfulUpdateAt).toLocaleTimeString("en-US", {
          hour12: false
        })}`
      : null;

  if (pausedState) {
    return (
      <div className="pointer-events-none border-b border-borderSoft bg-bgTertiary px-4 py-2 text-xs text-textSecondary">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="rounded bg-accentPrimary/20 px-2 py-0.5 text-accentPrimary">PAUSED</span>
          <div className="min-w-0 flex-1 truncate text-textPrimary">{pausedState}</div>
        </div>
      </div>
    );
  }

  const shouldRender = items.length > 0 || (hasConnectedOnce && streamState === "live");
  if (!shouldRender) {
    return null;
  }

  const streamText = items.length > 0 ? items.join("  •  ") : "Live updates active.";

  return (
    <div className="pointer-events-none border-b border-borderSoft bg-bgTertiary px-4 py-2 text-xs text-textSecondary">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-hidden whitespace-nowrap">
        <span className="rounded bg-accentDanger/20 px-2 py-0.5 text-accentDanger">LIVE</span>
        <div className="min-w-0 flex-1 truncate text-textPrimary">{streamText}</div>
      </div>
    </div>
  );
}
