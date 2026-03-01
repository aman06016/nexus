"use client";

export type StreamConnectionState = "connecting" | "retrying" | "live";

export type StreamHealthSnapshot = {
  connection: StreamConnectionState;
  connected: boolean;
  disconnectedForMs: number;
  isPaused: boolean;
  lastSuccessfulUpdateAt: number | null;
};

const UPDATE_EVENT = "nexus:stream-health-update";
const DISCONNECT_PAUSE_MS = 15_000;

let connectionState: StreamConnectionState = "connecting";
let connected = false;
let disconnectedAt: number | null = null;
let lastSuccessfulUpdateAt: number | null = null;

function buildSnapshot(now = Date.now()): StreamHealthSnapshot {
  const disconnectedForMs = disconnectedAt ? Math.max(0, now - disconnectedAt) : 0;
  return {
    connection: connectionState,
    connected,
    disconnectedForMs,
    isPaused: !connected && disconnectedForMs >= DISCONNECT_PAUSE_MS,
    lastSuccessfulUpdateAt
  };
}

function emitUpdate() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

export function recordStreamConnecting() {
  connectionState = "connecting";
  connected = false;
  disconnectedAt = disconnectedAt ?? Date.now();
  emitUpdate();
}

export function recordStreamRetrying() {
  connectionState = "retrying";
  connected = false;
  disconnectedAt = disconnectedAt ?? Date.now();
  emitUpdate();
}

export function recordStreamConnected() {
  connectionState = "live";
  connected = true;
  disconnectedAt = null;
  emitUpdate();
}

export function recordStreamMessage(at = Date.now()) {
  lastSuccessfulUpdateAt = at;
  emitUpdate();
}

export function recordStreamDisconnected() {
  connected = false;
  disconnectedAt = Date.now();
  emitUpdate();
}

export function getStreamHealthSnapshot(): StreamHealthSnapshot {
  return buildSnapshot();
}

export function subscribeStreamHealth(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onUpdate = () => listener();
  const onTick = () => listener();
  window.addEventListener(UPDATE_EVENT, onUpdate);
  const tick = window.setInterval(onTick, 1000);

  return () => {
    window.removeEventListener(UPDATE_EVENT, onUpdate);
    window.clearInterval(tick);
  };
}

