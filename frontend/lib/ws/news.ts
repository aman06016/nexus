export type NewsCallback = (message: string) => void;
export type NewsStatusCallback = () => void;
export type NewsErrorCallback = (event: Event) => void;

export type NewsStreamHandlers = {
  onMessage: NewsCallback;
  onOpen?: NewsStatusCallback;
  onClose?: NewsStatusCallback;
  onError?: NewsErrorCallback;
};

export function connectNewsStream(handlers: NewsStreamHandlers): WebSocket {
  const wsUrl = (process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080/ws/news").replace(/^http/, "ws");
  const socket = new WebSocket(wsUrl);

  socket.onopen = () => handlers.onOpen?.();
  socket.onmessage = (event) => handlers.onMessage(event.data);
  socket.onclose = () => handlers.onClose?.();
  socket.onerror = (event) => handlers.onError?.(event);

  return socket;
}
