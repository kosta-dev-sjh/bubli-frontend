import { apiRequest } from "@/lib/api/client";
import type {
  ActivityCurrentAppRequest,
  ActivityLogResponse,
  ActivityLogsByDateResponse,
  ActivityLogsTodayResponse,
} from "@/types/api/activity";

// Endpoints follow 10_API-Design 14.6: /api/activity/* (not /api/activity-logs/*).
export const activityApi = {
  recordCurrentApp(body: ActivityCurrentAppRequest) {
    return apiRequest<ActivityLogResponse>("/api/activity/current-app", {
      body,
      method: "POST",
    });
  },

  getToday() {
    return apiRequest<ActivityLogsTodayResponse>("/api/activity/today");
  },

  getByDate(date: string) {
    return apiRequest<ActivityLogsByDateResponse>(`/api/activity/logs?date=${encodeURIComponent(date)}`);
  },

  delete(activityLogId: string) {
    return apiRequest<null>(`/api/activity/${activityLogId}`, {
      method: "DELETE",
    });
  },
} as const;
