import {
  createRealtimeBrowserClient,
  type RealtimeBrowserClient,
  type RealtimeBrowserClientOptions,
  type RealtimeConnectionStatus,
} from "@/lib/realtime/browser-client";
import { parseRealtimeEventJson } from "@/lib/realtime/events";
import type { BubliRealtimeEvent } from "@/types/realtime";
import { websocketTopics } from "@/lib/websocket/topics";

export type RealtimeStatus = RealtimeConnectionStatus;
export type RealtimeMessageHandler = (envelope: BubliRealtimeEvent) => void;
export type RealtimeStatusHandler = (status: RealtimeStatus) => void;
export type RealtimeProtocol = {
  encodeSubscribe: (topic: string, token: string | null) => string | null;
  encodeUnsubscribe: (topic: string) => string | null;
  decode: (raw: string) => BubliRealtimeEvent | null;
};
export type RealtimeClientOptions = RealtimeBrowserClientOptions & {
  baseReconnectDelayMs?: number;
  protocol?: RealtimeProtocol;
};
export type RealtimeClient = RealtimeBrowserClient;

export function resolveRealtimeUrl(explicit?: string): string | undefined {
  return explicit ?? process.env.NEXT_PUBLIC_WS_URL;
}

export const jsonLineProtocol: RealtimeProtocol = {
  encodeSubscribe: (topic, token) =>
    JSON.stringify({ action: "subscribe", topic, token: token ?? undefined }),
  encodeUnsubscribe: (topic) => JSON.stringify({ action: "unsubscribe", topic }),
  decode: parseRealtimeEventJson,
};

export function deriveTopic(envelope: BubliRealtimeEvent): string {
  if (envelope.chatRoomId) {
    return websocketTopics.chatRoom(envelope.chatRoomId);
  }
  if (envelope.roomId) {
    return websocketTopics.projectRoomEvents(envelope.roomId);
  }
  return websocketTopics.notifications;
}

export function createRealtimeClient(options: RealtimeClientOptions = {}): RealtimeClient {
  return createRealtimeBrowserClient({
    dispatcher: options.dispatcher,
    getAccessToken: options.getAccessToken,
    maxReconnectDelayMs: options.maxReconnectDelayMs,
    reconnectBaseDelayMs: options.reconnectBaseDelayMs ?? options.baseReconnectDelayMs,
    url: resolveRealtimeUrl(options.url),
  });
}
