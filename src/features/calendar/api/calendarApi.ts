import { apiRequest } from "@/lib/api/client";
import type {
  CalendarEventGroupParams,
  CalendarEventGroupResponse,
  CalendarEventResponse,
  GoogleCalendarCallbackRequest,
  GoogleCalendarConnectResponse,
  GoogleCalendarConnectionResponse,
  GoogleCalendarListEntry,
  GoogleCalendarSyncParams,
  ProjectRoomEventListParams,
  ProjectRoomEventListResponse,
  RoomCalendarResponse,
  ScheduleListParams,
  SchedulePageResponse,
  ScheduleRequest,
} from "@/types/api/calendar";
import type { ScheduleResponse } from "@/types/api/work";

function calendarQuery(params: ScheduleListParams = {}) {
  const searchParams = new URLSearchParams();
  // 백엔드 GET /api/schedules는 from/to(ISO date-time)로 기간을 거른다.
  const from = params.from ?? params.start;
  const to = params.to ?? params.end;

  if (from) searchParams.set("from", from);
  if (to) searchParams.set("to", to);
  if (params.roomId) searchParams.set("roomId", params.roomId);
  if (params.page !== undefined) searchParams.set("page", String(params.page));
  if (params.size !== undefined) searchParams.set("size", String(params.size));

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function projectRoomEventQuery(params: ProjectRoomEventListParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.afterSequence !== undefined) searchParams.set("afterSequence", String(params.afterSequence));
  if (params.limit !== undefined) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function requiredCalendarRangeQuery(params: GoogleCalendarSyncParams) {
  const searchParams = new URLSearchParams();
  searchParams.set("from", params.from);
  searchParams.set("to", params.to);
  for (const calendarId of params.calendarIds ?? []) {
    searchParams.append("calendarIds", calendarId);
  }
  return `?${searchParams.toString()}`;
}

function calendarGroupQuery(params: CalendarEventGroupParams) {
  const searchParams = new URLSearchParams();
  searchParams.set("from", params.from);
  searchParams.set("to", params.to);
  if (params.roomId) searchParams.set("roomId", params.roomId);
  if (params.localLimit !== undefined) searchParams.set("localLimit", String(params.localLimit));
  for (const calendarId of params.googleCalendarIds ?? []) {
    searchParams.append("googleCalendarIds", calendarId);
  }
  return `?${searchParams.toString()}`;
}

// 구글 OAuth가 인증 코드를 돌려줄 프론트 라우트(src/app/calendar/google/callback/page.tsx).
// 백엔드 google.calendar.redirect-uri 기본값과 같은 경로라서, 어느 오리진에서 열려도 짝이 맞는다.
export function googleCalendarRedirectUri() {
  return `${window.location.origin}/calendar/google/callback`;
}

export const calendarApi = {
  // 구글 연결만 calendar 컨트롤러를 쓴다. 일정 CRUD는 /api/schedules가 기준.
  // redirectUri를 넘기면 구글 인증 후 그 주소로 돌아온다(생략 시 백엔드 기본값).
  requestGoogleConnectUrl(redirectUri?: string) {
    const query = redirectUri ? `?redirectUri=${encodeURIComponent(redirectUri)}` : "";
    return apiRequest<GoogleCalendarConnectResponse>(`/api/calendar/google/connect${query}`);
  },

  callbackGoogle(body: GoogleCalendarCallbackRequest) {
    return apiRequest<GoogleCalendarConnectionResponse>("/api/calendar/google/callback", {
      body,
      method: "POST",
    });
  },

  getGoogleConnection() {
    return apiRequest<GoogleCalendarConnectionResponse>("/api/calendar/google/connection");
  },

  disconnectGoogleConnection() {
    return apiRequest<null>("/api/calendar/google/connection", {
      method: "DELETE",
    });
  },

  // 연결된 구글 계정의 캘린더 목록.
  getGoogleCalendars() {
    return apiRequest<GoogleCalendarListEntry[]>("/api/calendar/google/calendars");
  },

  // 룸 전용 구글 캘린더 매핑 조회. 구글 연동이 활성 상태면 룸 이름으로 캘린더를 지연 생성한다.
  getRoomCalendar(roomId: string) {
    return apiRequest<RoomCalendarResponse>(`/api/calendar/rooms/${roomId}/calendar`);
  },

  // 로컬 일정(프로젝트룸 단위 그룹) + 구글 캘린더 일정 그룹 조회.
  getGroupedEvents(params: CalendarEventGroupParams) {
    return apiRequest<CalendarEventGroupResponse[]>(`/api/calendar/groups${calendarGroupQuery(params)}`);
  },

  syncGoogleEvents(params: GoogleCalendarSyncParams) {
    return apiRequest<ScheduleResponse[]>(`/api/calendar/sync${requiredCalendarRangeQuery(params)}`, {
      method: "POST",
    });
  },

  pushUnsyncedGoogleEvents(params: GoogleCalendarSyncParams) {
    return apiRequest<ScheduleResponse[]>(`/api/calendar/push-unsynced${requiredCalendarRangeQuery(params)}`, {
      method: "POST",
    });
  },

  getEvents(params?: ScheduleListParams) {
    return apiRequest<SchedulePageResponse>(`/api/schedules${calendarQuery(params)}`);
  },

  getProjectRoomEvents(roomId: string, params?: ProjectRoomEventListParams) {
    return apiRequest<ProjectRoomEventListResponse>(`/api/project-rooms/${roomId}/events${projectRoomEventQuery(params)}`);
  },

  createEvent(body: ScheduleRequest) {
    return apiRequest<ScheduleResponse>("/api/schedules", {
      body,
      method: "POST",
    });
  },

  createGoogleCalendarEvent(body: ScheduleRequest) {
    return apiRequest<CalendarEventResponse>("/api/calendar/events", {
      body,
      method: "POST",
    });
  },

  getGoogleCalendarEvents(params?: ScheduleListParams) {
    return apiRequest<SchedulePageResponse>(`/api/calendar/events${calendarQuery(params)}`);
  },

  updateGoogleCalendarEvent(scheduleId: string, body: Partial<ScheduleRequest>) {
    return apiRequest<CalendarEventResponse>(`/api/calendar/events/${scheduleId}`, {
      body,
      method: "PATCH",
    });
  },

  deleteGoogleCalendarEvent(scheduleId: string) {
    return apiRequest<null>(`/api/calendar/events/${scheduleId}`, {
      method: "DELETE",
    });
  },

  updateEvent(scheduleId: string, body: Partial<ScheduleRequest>) {
    return apiRequest<ScheduleResponse>(`/api/schedules/${scheduleId}`, {
      body,
      method: "PATCH",
    });
  },

  deleteEvent(scheduleId: string) {
    return apiRequest<null>(`/api/schedules/${scheduleId}`, {
      method: "DELETE",
    });
  },
} as const;
