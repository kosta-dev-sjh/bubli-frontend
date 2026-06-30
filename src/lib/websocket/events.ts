import type {
  BubliRealtimeEvent,
  ChatMessageRealtimePayload,
  ChatReadStateRealtimePayload,
  NotificationRealtimePayload,
  ProjectRoomRealtimeEventType,
  RealtimeEnvelope as CanonicalRealtimeEnvelope,
  RealtimeEventType,
  WidgetSummaryInvalidatedPayload,
} from "@/types/realtime";

export {
  CHAT_REALTIME_EVENT_TYPES,
  NOTIFICATION_REALTIME_EVENT_TYPES,
  PROJECT_ROOM_REALTIME_EVENT_TYPES,
  WIDGET_REALTIME_EVENT_TYPES,
} from "@/types/realtime";

export type RealtimeEnvelope<
  TType extends RealtimeEventType = RealtimeEventType,
  TPayload = unknown,
> = CanonicalRealtimeEnvelope<TPayload, TType>;

export type ProjectRoomEventType = ProjectRoomRealtimeEventType;
export type ChatMessageEventPayload = ChatMessageRealtimePayload;
export type ChatReadStatePayload = ChatReadStateRealtimePayload;
export type NotificationEventPayload = NotificationRealtimePayload;
export type WidgetSummaryInvalidatedEventPayload = WidgetSummaryInvalidatedPayload;
export type AnyRealtimeEnvelope = BubliRealtimeEvent;

export const WIDGET_SUMMARY_REFRESH_SIGNAL = "WIDGET_SUMMARY_INVALIDATED" as const;

export const WIDGET_SUMMARY_TRIGGER_EVENTS: readonly ProjectRoomRealtimeEventType[] = [
  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_STATUS_CHANGED",
  "TASK_DELETED",
  "SCHEDULE_CREATED",
  "SCHEDULE_UPDATED",
  "SCHEDULE_DELETED",
  "RESOURCE_UPLOADED",
  "RESOURCE_ANALYSIS_COMPLETED",
  "AGENT_SUGGESTIONS_CREATED",
  "AGENT_SUGGESTION_APPROVED",
];
