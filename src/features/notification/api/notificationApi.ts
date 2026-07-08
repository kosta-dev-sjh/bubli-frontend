import { apiRequest } from "@/lib/api/client";
import type { PageResponse } from "@/types/api/common";
import type { NotificationResponse, NotificationStatus } from "@/types/api/notification";

type NotificationListParams = {
  page?: number;
  size?: number;
  status?: NotificationStatus;
};

export const notificationApi = {
  list({ page = 0, size = 20, status }: NotificationListParams = {}) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (status) params.set("status", status);
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

  // 알림 일괄 지우기(전체 보관) — 목록에서 모두 사라지고 배지도 0이 된다.
  archiveAll() {
    return apiRequest<unknown>("/api/notifications/archive-all", {
      method: "PATCH",
    });
  },
} as const;
