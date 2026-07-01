import { apiRequest } from "@/lib/api/client";
import type { PageResponse } from "@/types/api/common";
import type { NotificationResponse } from "@/types/api/notification";

export const notificationApi = {
  list() {
    return apiRequest<PageResponse<NotificationResponse>>("/api/notifications");
  },

  markRead(notificationId: string) {
    return apiRequest<unknown>(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  },

  archive(notificationId: string) {
    return apiRequest<unknown>(`/api/notifications/${notificationId}/archive`, {
      method: "PATCH",
    });
  },
} as const;
