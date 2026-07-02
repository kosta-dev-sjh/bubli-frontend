import { apiRequest } from "@/lib/api/client";
import type { ActivityCurrentAppRequest, ActivityLogResponse, ActivityLogsTodayResponse } from "@/types/api/activity";

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

  delete(activityLogId: string) {
    return apiRequest<null>(`/api/activity/${activityLogId}`, {
      method: "DELETE",
    });
  },
} as const;
