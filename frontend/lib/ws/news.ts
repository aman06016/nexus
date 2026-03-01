export type NewsCallback = (message: string) => void;

export function connectNewsStream(onMessage: NewsCallback): WebSocket {
  const wsUrl = (process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080/ws/news").replace(/^http/, "ws");
  const socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => onMessage(event.data);

  return socket;
}
