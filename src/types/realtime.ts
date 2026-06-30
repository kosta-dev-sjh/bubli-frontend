import type { ChatMessageResponse } from "@/types/api/chat";
import type { RealtimeActor } from "@/types/api/common";
import type { NotificationResponse } from "@/types/api/notification";
import type { WidgetBubbleType, WidgetItemState } from "@/types/api/widget";

export type { RealtimeActor };

export const PROJECT_ROOM_REALTIME_EVENT_TYPES = [
  "ROOM_UPDATED",
  "ROOM_MEMBER_JOINED",
  "ROOM_MEMBER_LEFT",
  "ROOM_MEMBER_ROLE_CHANGED",
  "ROOM_MEMBER_REMOVED",
  "RESOURCE_UPLOADED",
  "RESOURCE_UPDATED",
  "RESOURCE_DELETED",
  "RESOURCE_COMMENT_CREATED",
  "RESOURCE_COMMENT_UPDATED",
  "RESOURCE_COMMENT_DELETED",
  "RESOURCE_ANALYSIS_STARTED",
  "RESOURCE_ANALYSIS_COMPLETED",
  "RESOURCE_ANALYSIS_FAILED",
  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_STATUS_CHANGED",
  "TASK_DELETED",
  "WBS_CREATED",
  "WBS_UPDATED",
  "WBS_REORDERED",
  "WBS_DELETED",
  "SCHEDULE_CREATED",
  "SCHEDULE_UPDATED",
  "SCHEDULE_DELETED",
  "AGENT_JOB_CREATED",
  "AGENT_JOB_STATUS_CHANGED",
  "AGENT_SUGGESTIONS_CREATED",
  "AGENT_SUGGESTION_APPROVED",
  "AGENT_SUGGESTION_REJECTED",
  "VOICE_ROOM_OPENED",
  "VOICE_PARTICIPANT_JOINED",
  "VOICE_PARTICIPANT_LEFT",
  "VOICE_ROOM_ENDED",
] as const;

export type ProjectRoomRealtimeEventType = (typeof PROJECT_ROOM_REALTIME_EVENT_TYPES)[number];

export const CHAT_REALTIME_EVENT_TYPES = ["CHAT_MESSAGE_CREATED", "CHAT_READ_STATE_UPDATED"] as const;

export type ChatRealtimeEventType = (typeof CHAT_REALTIME_EVENT_TYPES)[number];

export const NOTIFICATION_REALTIME_EVENT_TYPES = [
  "NOTIFICATION_CREATED",
  "NOTIFICATION_READ",
  "NOTIFICATION_BULK_READ",
] as const;

export type NotificationRealtimeEventType = (typeof NOTIFICATION_REALTIME_EVENT_TYPES)[number];

export const WIDGET_REALTIME_EVENT_TYPES = [
  "WIDGET_CONTEXT_CHANGED",
  "WIDGET_ITEM_STATE_CHANGED",
  "WIDGET_SUMMARY_INVALIDATED",
] as const;

export type WidgetRealtimeEventType = (typeof WIDGET_REALTIME_EVENT_TYPES)[number];

export type RealtimeEventType =
  | ProjectRoomRealtimeEventType
  | ChatRealtimeEventType
  | NotificationRealtimeEventType
  | WidgetRealtimeEventType;

export type RealtimeTopic =
  | { kind: "projectRoom"; roomId: string }
  | { kind: "chatRoom"; chatRoomId: string }
  | { kind: "notifications" }
  | { kind: "widget"; roomId?: string | null };

export type RealtimeEnvelope<TPayload = unknown, TType extends string = RealtimeEventType> = {
  eventId: string;
  eventType: TType;
  sequence?: number;
  roomId?: string;
  chatRoomId?: string;
  occurredAt: string;
  actor?: RealtimeActor;
  payload: TPayload;
};

export type ProjectRoomRealtimePayload = {
  entityId?: string;
  entityType?:
    | "PROJECT_ROOM"
    | "ROOM_MEMBER"
    | "RESOURCE"
    | "RESOURCE_COMMENT"
    | "TASK"
    | "WBS"
    | "SCHEDULE"
    | "AGENT_JOB"
    | "AGENT_SUGGESTION"
    | "VOICE_ROOM";
  previousStatus?: string | null;
  status?: string | null;
  changedFields?: string[];
  summary?: string;
};

export type ChatMessageRealtimePayload = ChatMessageResponse;

export type ChatReadStateRealtimePayload = {
  chatRoomId: string;
  lastReadSequence: number;
  userId: string;
};

export type NotificationRealtimePayload = NotificationResponse;

export type NotificationBulkReadRealtimePayload = {
  notificationIds?: string[];
  readAt: string;
};

export type WidgetContextRealtimePayload = {
  selectedRoomId?: string | null;
};

export type WidgetItemStateRealtimePayload = {
  bubbleType: WidgetBubbleType;
  itemId: string;
  itemType: string;
  state: WidgetItemState;
};

export type WidgetSummaryInvalidatedPayload = {
  bubbleTypes: WidgetBubbleType[];
  reason: RealtimeEventType;
  roomId?: string | null;
};

export type BubliRealtimeEvent =
  | RealtimeEnvelope<ProjectRoomRealtimePayload, ProjectRoomRealtimeEventType>
  | RealtimeEnvelope<ChatMessageRealtimePayload, "CHAT_MESSAGE_CREATED">
  | RealtimeEnvelope<ChatReadStateRealtimePayload, "CHAT_READ_STATE_UPDATED">
  | RealtimeEnvelope<NotificationRealtimePayload, "NOTIFICATION_CREATED" | "NOTIFICATION_READ">
  | RealtimeEnvelope<NotificationBulkReadRealtimePayload, "NOTIFICATION_BULK_READ">
  | RealtimeEnvelope<WidgetContextRealtimePayload, "WIDGET_CONTEXT_CHANGED">
  | RealtimeEnvelope<WidgetItemStateRealtimePayload, "WIDGET_ITEM_STATE_CHANGED">
  | RealtimeEnvelope<WidgetSummaryInvalidatedPayload, "WIDGET_SUMMARY_INVALIDATED">;

export type RealtimeSupplementCursor = {
  chatRoomId?: string;
  lastReceivedSequence: number | null;
  roomId?: string;
};
