import { apiRequest } from "@/lib/api/client";
import type { ActivityLogsTodayResponse } from "@/types/api/activity";

export const activityApi = {
  getToday() {
    return apiRequest<ActivityLogsTodayResponse>("/api/activity-logs/today");
  },

  delete(activityLogId: string) {
    return apiRequest<null>(`/api/activity-logs/${activityLogId}`, {
      method: "DELETE",
    });
  },
} as const;
