import { apiRequest, getApiBaseUrl } from "@/lib/api/client";
import type { CalendarEventListParams, CalendarEventRequest, CalendarEventResponse } from "@/types/api/calendar";

function calendarEventQuery(params: CalendarEventListParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.start) searchParams.set("start", params.start);
  if (params.end) searchParams.set("end", params.end);
  if (params.roomId) searchParams.set("roomId", params.roomId);

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const calendarApi = {
  getGoogleConnectUrl() {
    return `${getApiBaseUrl()}/api/calendar/google/connect`;
  },

  getEvents(params?: CalendarEventListParams) {
    return apiRequest<CalendarEventResponse[]>(`/api/calendar/events${calendarEventQuery(params)}`);
  },

  createEvent(body: CalendarEventRequest) {
    return apiRequest<CalendarEventResponse>("/api/calendar/events", {
      body,
      method: "POST",
    });
  },

  updateEvent(eventId: string, body: Partial<CalendarEventRequest>) {
    return apiRequest<CalendarEventResponse>(`/api/calendar/events/${eventId}`, {
      body,
      method: "PATCH",
    });
  },

  deleteEvent(eventId: string) {
    return apiRequest<null>(`/api/calendar/events/${eventId}`, {
      method: "DELETE",
    });
  },
} as const;
