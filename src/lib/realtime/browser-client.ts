import { createRealtimeDispatcher, type RealtimeDispatcher } from "@/lib/realtime/dispatcher";
import { parseRealtimeEventJson } from "@/lib/realtime/events";
import type { BubliRealtimeEvent, RealtimeTopic } from "@/types/realtime";

export type RealtimeConnectionStatus =
  | "IDLE"
  | "DISABLED"
  | "CONNECTING"
  | "OPEN"
  | "RECONNECTING"
  | "CLOSED";

export type RealtimeBrowserClientOptions = {
  dispatcher?: RealtimeDispatcher;
  getAccessToken?: () => Promise<string | null | undefined> | string | null | undefined;
  maxReconnectDelayMs?: number;
  reconnectBaseDelayMs?: number;
  url?: string;
};

export type RealtimeBrowserClient = {
  connect: () => void;
  disconnect: () => void;
  dispatcher: RealtimeDispatcher;
  getStatus: () => RealtimeConnectionStatus;
  onStatusChange: (handler: (status: RealtimeConnectionStatus) => void) => () => void;
  subscribe: RealtimeDispatcher["subscribe"];
  subscribeToTopic: (topic: RealtimeTopic, handler: (event: BubliRealtimeEvent) => void) => () => void;
};

const DEFAULT_RECONNECT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30000;

export function createRealtimeBrowserClient(
  options: RealtimeBrowserClientOptions = {},
): RealtimeBrowserClient {
  const dispatcher = options.dispatcher ?? createRealtimeDispatcher();
  const statusHandlers = new Set<(status: RealtimeConnectionStatus) => void>();
  const reconnectBaseDelayMs = options.reconnectBaseDelayMs ?? DEFAULT_RECONNECT_BASE_DELAY_MS;
  const maxReconnectDelayMs = options.maxReconnectDelayMs ?? DEFAULT_MAX_RECONNECT_DELAY_MS;

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let status: RealtimeConnectionStatus = "IDLE";
  let manuallyClosed = false;

  function setStatus(next: RealtimeConnectionStatus) {
    status = next;
    statusHandlers.forEach((handler) => handler(next));
  }

  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function createSocket(): WebSocket | null {
    if (!options.url || typeof window === "undefined" || typeof WebSocket === "undefined") {
      setStatus("DISABLED");
      return null;
    }

    return new WebSocket(options.url);
  }

  function scheduleReconnect() {
    if (manuallyClosed || !options.url) {
      return;
    }
    const delay = Math.min(
      maxReconnectDelayMs,
      reconnectBaseDelayMs * 2 ** Math.min(reconnectAttempt, 5),
    );
    reconnectAttempt += 1;
    setStatus("RECONNECTING");
    reconnectTimer = setTimeout(() => {
      void openSocket();
    }, delay);
  }

  async function openSocket() {
    clearReconnectTimer();
    manuallyClosed = false;
    setStatus(reconnectAttempt === 0 ? "CONNECTING" : "RECONNECTING");

    const nextSocket = createSocket();
    if (!nextSocket) {
      return;
    }

    socket = nextSocket;
    nextSocket.onopen = () => {
      reconnectAttempt = 0;
      setStatus("OPEN");
    };
    nextSocket.onmessage = (message) => {
      if (typeof message.data !== "string") {
        return;
      }
      const event = parseRealtimeEventJson(message.data);
      if (event) {
        dispatcher.dispatch(event);
      }
    };
    nextSocket.onclose = () => {
      socket = null;
      if (manuallyClosed) {
        setStatus("CLOSED");
        return;
      }
      scheduleReconnect();
    };
    nextSocket.onerror = () => {
      nextSocket.close();
    };
  }

  return {
    connect() {
      if (socket || status === "CONNECTING" || status === "RECONNECTING") {
        return;
      }
      void openSocket();
    },
    disconnect() {
      manuallyClosed = true;
      clearReconnectTimer();
      socket?.close();
      socket = null;
      setStatus("CLOSED");
    },
    dispatcher,
    getStatus() {
      return status;
    },
    onStatusChange(handler) {
      statusHandlers.add(handler);
      return () => {
        statusHandlers.delete(handler);
      };
    },
    subscribe: dispatcher.subscribe,
    subscribeToTopic: dispatcher.subscribeToTopic,
  };
}
