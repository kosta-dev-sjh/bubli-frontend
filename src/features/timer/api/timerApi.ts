import { apiRequest } from "@/lib/api/client";
import type { StartTimeLogRequest, TimeLogResponse } from "@/types/api/timer";

export const timerApi = {
  start(body: StartTimeLogRequest) {
    return apiRequest<TimeLogResponse>("/api/time-logs/start", {
      body,
      method: "POST",
    });
  },

  pause(timeLogId: string) {
    return apiRequest<TimeLogResponse>(`/api/time-logs/${timeLogId}/pause`, {
      method: "PATCH",
    });
  },

  resume(timeLogId: string) {
    return apiRequest<TimeLogResponse>(`/api/time-logs/${timeLogId}/resume`, {
      method: "PATCH",
    });
  },

  stop(timeLogId: string) {
    return apiRequest<TimeLogResponse>(`/api/time-logs/${timeLogId}/stop`, {
      method: "PATCH",
    });
  },

  heartbeat(timeLogId: string) {
    return apiRequest<TimeLogResponse>(`/api/time-logs/${timeLogId}/heartbeat`, {
      method: "PATCH",
    });
  },
} as const;
