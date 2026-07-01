import type { PageResponse, RealtimeActor, SequenceListResponse } from "./common";
import type { ScheduleResponse } from "./work";

export type ScheduleListParams = {
  end?: string;
  from?: string;
  page?: number;
  roomId?: string;
  size?: number;
  start?: string;
  to?: string;
};

export type ScheduleRequest = {
  allDay?: boolean;
  endsAt?: string | null;
  roomId?: string | null;
  startsAt: string;
  taskId?: string | null;
  title: string;
  wbsItemId?: string | null;
};

export type SchedulePageResponse = PageResponse<ScheduleResponse>;

export type ProjectRoomEventType =
  | "ROOM_UPDATED"
  | "ROOM_MEMBER_JOINED"
  | "ROOM_MEMBER_LEFT"
  | "ROOM_MEMBER_ROLE_CHANGED"
  | "ROOM_MEMBER_REMOVED"
  | "RESOURCE_UPLOADED"
  | "RESOURCE_UPDATED"
  | "RESOURCE_DELETED"
  | "RESOURCE_ANALYSIS_STARTED"
  | "RESOURCE_ANALYSIS_COMPLETED"
  | "RESOURCE_ANALYSIS_FAILED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_STATUS_CHANGED"
  | "TASK_DELETED"
  | "WBS_CREATED"
  | "WBS_UPDATED"
  | "WBS_REORDERED"
  | "WBS_DELETED"
  | "SCHEDULE_CREATED"
  | "SCHEDULE_UPDATED"
  | "SCHEDULE_DELETED"
  | "AGENT_JOB_CREATED"
  | "AGENT_JOB_STATUS_CHANGED"
  | "AGENT_SUGGESTIONS_CREATED"
  | "AGENT_SUGGESTION_APPROVED"
  | "AGENT_SUGGESTION_REJECTED"
  | "VOICE_ROOM_OPENED"
  | "VOICE_PARTICIPANT_JOINED"
  | "VOICE_PARTICIPANT_LEFT"
  | "VOICE_ROOM_ENDED";

export type ProjectRoomEventEnvelope<T = Record<string, unknown>> = {
  actor: RealtimeActor;
  eventId: string;
  eventType: ProjectRoomEventType;
  occurredAt: string;
  payload: T;
  roomId: string;
  sequence: number;
};

export type ProjectRoomEventListParams = {
  afterSequence?: number;
  limit?: number;
};

export type ProjectRoomEventListResponse = SequenceListResponse<ProjectRoomEventEnvelope>;
