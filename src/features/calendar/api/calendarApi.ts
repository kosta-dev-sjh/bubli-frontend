import { apiRequest, getApiBaseUrl } from "@/lib/api/client";
import type {
  ProjectRoomEventListParams,
  ProjectRoomEventListResponse,
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

export const calendarApi = {
  // 구글 연결만 calendar 컨트롤러를 쓴다. 일정 CRUD는 /api/schedules가 기준.
  getGoogleConnectUrl() {
    return `${getApiBaseUrl()}/api/calendar/google/connect`;
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
