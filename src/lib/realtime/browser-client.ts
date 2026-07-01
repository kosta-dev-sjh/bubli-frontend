import { createRealtimeDispatcher, type RealtimeDispatcher } from "@/lib/realtime/dispatcher";
import { parseRealtimeEventJson } from "@/lib/realtime/events";
import type { BubliRealtimeEvent, RealtimeTopic } from "@/types/realtime";
import { websocketTopics } from "@/lib/websocket/topics";

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
  let subscriptionId = 0;
  let status: RealtimeConnectionStatus = "IDLE";
  let manuallyClosed = false;
  const subscribedTopics = new Map<string, string>();

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

  async function readAccessToken() {
    return (await options.getAccessToken?.()) ?? null;
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
      void readAccessToken().then((token) => {
        if (!token || nextSocket.readyState !== WebSocket.OPEN) {
          nextSocket.close();
          return;
        }

        nextSocket.send(
          encodeStompFrame("CONNECT", {
            Authorization: `Bearer ${token}`,
            "accept-version": "1.2",
            "heart-beat": "10000,10000",
          }),
        );
      });
    };
    nextSocket.onmessage = (message) => {
      if (typeof message.data !== "string") {
        return;
      }
      handleSocketMessage(message.data);
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

  function handleSocketMessage(raw: string) {
    for (const frame of parseStompFrames(raw)) {
      if (frame.command === "CONNECTED") {
        reconnectAttempt = 0;
        setStatus("OPEN");
        subscribedTopics.forEach((destination) => {
          sendSubscribe(destination);
        });
        continue;
      }
      if (frame.command === "MESSAGE") {
        const event = parseRealtimeEventJson(frame.body);
        if (event) {
          dispatcher.dispatch(event);
        }
        continue;
      }
      if (frame.command === "ERROR") {
        socket?.close();
      }
    }

    if (!raw.includes("\n")) {
      const event = parseRealtimeEventJson(raw);
      if (event) {
        dispatcher.dispatch(event);
      }
    }
  }

  function sendSubscribe(destination: string) {
    if (!socket || socket.readyState !== WebSocket.OPEN || status !== "OPEN") {
      return;
    }

    socket.send(
      encodeStompFrame("SUBSCRIBE", {
        ack: "auto",
        destination,
        id: `sub-${subscriptionId++}`,
      }),
    );
  }

  function topicToDestination(topic: RealtimeTopic) {
    if (topic.kind === "chatRoom") {
      return websocketTopics.chatRoom(topic.chatRoomId);
    }
    if (topic.kind === "projectRoom") {
      return websocketTopics.projectRoomEvents(topic.roomId);
    }
    return websocketTopics.notifications;
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
    subscribeToTopic(topic, handler) {
      const destination = topicToDestination(topic);
      subscribedTopics.set(JSON.stringify(topic), destination);
      sendSubscribe(destination);
      const unsubscribe = dispatcher.subscribeToTopic(topic, handler);
      return () => {
        unsubscribe();
        subscribedTopics.delete(JSON.stringify(topic));
      };
    },
  };
}

type StompFrame = {
  body: string;
  command: string;
  headers: Record<string, string>;
};

function encodeStompFrame(command: string, headers: Record<string, string>, body = "") {
  const headerText = Object.entries(headers)
    .map(([key, value]) => `${key}:${value}`)
    .join("\n");

  return `${command}\n${headerText}\n\n${body}\0`;
}

function parseStompFrames(raw: string): StompFrame[] {
  return raw
    .split("\0")
    .map((frame) => frame.trim())
    .filter(Boolean)
    .map(parseStompFrame);
}

function parseStompFrame(raw: string): StompFrame {
  const [head = "", body = ""] = raw.split("\n\n");
  const [command = "", ...headerLines] = head.split("\n");
  const headers = Object.fromEntries(
    headerLines
      .map((line) => {
        const separator = line.indexOf(":");
        return separator >= 0 ? [line.slice(0, separator), line.slice(separator + 1)] : null;
      })
      .filter((entry): entry is [string, string] => Boolean(entry)),
  );

  return { body, command, headers };
}
