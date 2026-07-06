import { apiRequest } from "@/lib/api/client";
import type { PageResponse } from "@/types/api/common";
import type { NotificationResponse } from "@/types/api/notification";

type NotificationListParams = {
  page?: number;
  size?: number;
};

export const notificationApi = {
  list({ page = 0, size = 20 }: NotificationListParams = {}) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    return apiRequest<PageResponse<NotificationResponse>>(`/api/notifications?${params.toString()}`);
  },

  markRead(notificationId: string) {
    return apiRequest<unknown>(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  },

  markAllRead() {
    return apiRequest<unknown>("/api/notifications/read-all", {
      method: "PATCH",
    });
  },

  archive(notificationId: string) {
    return apiRequest<unknown>(`/api/notifications/${notificationId}/archive`, {
      method: "PATCH",
    });
  },
} as const;
