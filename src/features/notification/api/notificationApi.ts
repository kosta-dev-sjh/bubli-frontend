import { apiRequest } from "@/lib/api/client";
import type { NotificationResponse } from "@/types/api/notification";

export const notificationApi = {
  list() {
    return apiRequest<NotificationResponse[]>("/api/notifications");
  },

  markRead(notificationId: string) {
    return apiRequest<NotificationResponse>(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  },

  archive(notificationId: string) {
    return apiRequest<NotificationResponse>(`/api/notifications/${notificationId}/archive`, {
      method: "PATCH",
    });
  },
} as const;
