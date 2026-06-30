import {
  CHAT_REALTIME_EVENT_TYPES,
  NOTIFICATION_REALTIME_EVENT_TYPES,
  PROJECT_ROOM_REALTIME_EVENT_TYPES,
  WIDGET_REALTIME_EVENT_TYPES,
  type BubliRealtimeEvent,
  type RealtimeEventType,
  type RealtimeTopic,
} from "@/types/realtime";

const REALTIME_EVENT_TYPES = new Set<string>([
  ...PROJECT_ROOM_REALTIME_EVENT_TYPES,
  ...CHAT_REALTIME_EVENT_TYPES,
  ...NOTIFICATION_REALTIME_EVENT_TYPES,
  ...WIDGET_REALTIME_EVENT_TYPES,
]);

export function isRealtimeEventType(value: unknown): value is RealtimeEventType {
  return typeof value === "string" && REALTIME_EVENT_TYPES.has(value);
}

export function toRealtimeTopicKey(topic: RealtimeTopic): string {
  if (topic.kind === "projectRoom") {
    return `projectRoom:${topic.roomId}`;
  }
  if (topic.kind === "chatRoom") {
    return `chatRoom:${topic.chatRoomId}`;
  }
  if (topic.kind === "widget") {
    return topic.roomId ? `widget:${topic.roomId}` : "widget";
  }
  return "notifications";
}

export function deriveRealtimeTopicKey(event: BubliRealtimeEvent): string {
  if (event.chatRoomId) {
    return toRealtimeTopicKey({ kind: "chatRoom", chatRoomId: event.chatRoomId });
  }
  if (event.roomId && event.eventType.startsWith("WIDGET_")) {
    return toRealtimeTopicKey({ kind: "widget", roomId: event.roomId });
  }
  if (event.roomId) {
    return toRealtimeTopicKey({ kind: "projectRoom", roomId: event.roomId });
  }
  if (event.eventType.startsWith("WIDGET_")) {
    return toRealtimeTopicKey({ kind: "widget" });
  }
  return toRealtimeTopicKey({ kind: "notifications" });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseRealtimeEvent(input: unknown): BubliRealtimeEvent | null {
  if (!isObject(input)) {
    return null;
  }
  if (typeof input.eventId !== "string" || !isRealtimeEventType(input.eventType)) {
    return null;
  }
  if (typeof input.occurredAt !== "string" || !("payload" in input)) {
    return null;
  }
  if ("sequence" in input && typeof input.sequence !== "number") {
    return null;
  }
  if ("roomId" in input && input.roomId !== undefined && typeof input.roomId !== "string") {
    return null;
  }
  if (
    "chatRoomId" in input &&
    input.chatRoomId !== undefined &&
    typeof input.chatRoomId !== "string"
  ) {
    return null;
  }

  return input as BubliRealtimeEvent;
}

export function parseRealtimeEventJson(raw: string): BubliRealtimeEvent | null {
  try {
    return parseRealtimeEvent(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}
