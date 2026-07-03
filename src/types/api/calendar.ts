import type { PageResponse, RealtimeActor, SequenceListResponse } from "./common";
import type { ScheduleResponse, ScheduleSyncStatus } from "./work";

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

export type CalendarEventResponse = {
  calendarConnectionRequired: boolean;
  schedule: ScheduleResponse;
};

export type GoogleCalendarConnectResponse = {
  authorizeUrl: string;
};

export type GoogleCalendarConnectionStatus = "ACTIVE" | "REVOKED";

export type GoogleCalendarConnectionResponse = {
  expiresAt?: string | null;
  googleAccountEmail?: string | null;
  status: GoogleCalendarConnectionStatus;
  updatedAt: string;
};

export type GoogleCalendarCallbackRequest = {
  code: string;
  redirectUri?: string | null;
};

export type GoogleCalendarSyncParams = {
  // POST /api/calendar/sync — calendarIds를 넘기면 해당 구글 캘린더만 동기화한다.
  calendarIds?: string[];
  from: string;
  to: string;
};

// GET /api/calendar/google/calendars 응답 항목 (백엔드 GoogleCalendarListEntry).
export type GoogleCalendarListEntry = {
  accessRole?: string | null;
  backgroundColor?: string | null;
  id: string;
  primary?: boolean | null;
  selected?: boolean | null;
  summary?: string | null;
};

// GET /api/calendar/groups — 로컬 일정은 프로젝트룸 단위, 구글 일정은 캘린더 단위로 묶인다.
export type CalendarEventGroupType = "PERSONAL" | "PROJECT_ROOM" | "GOOGLE_CALENDAR";

export type CalendarEventSourceType = "BUBLI" | "GOOGLE";

export type CalendarGroupEventResponse = {
  allDay: boolean;
  endsAt?: string | null;
  googleCalendarId?: string | null;
  googleCalendarSummary?: string | null;
  googleEventId?: string | null;
  ownerUserId?: string | null;
  roomId?: string | null;
  scheduleId?: string | null;
  sourceType: CalendarEventSourceType;
  startsAt: string;
  syncStatus: ScheduleSyncStatus;
  title: string;
};

export type CalendarEventGroupResponse = {
  eventCount: number;
  events: CalendarGroupEventResponse[];
  googleCalendarId?: string | null;
  groupId: string;
  groupName: string;
  groupType: CalendarEventGroupType;
  roomId?: string | null;
};

export type CalendarEventGroupParams = {
  from: string;
  googleCalendarIds?: string[];
  localLimit?: number;
  roomId?: string;
  to: string;
};

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
