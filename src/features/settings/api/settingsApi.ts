import { apiRequest } from "@/lib/api/client";
import type {
  NotificationPreferencesResponse,
  NotificationPreferencesUpdateRequest,
} from "@/types/api/notification";
import type {
  PrivacyConsentsResponse,
  PrivacyConsentsUpdateRequest,
  StorageUsageResponse,
} from "@/types/api/settings";

export type StorageUsageParams = {
  roomId?: string;
};

function storageUsageQuery(params: StorageUsageParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.roomId) searchParams.set("roomId", params.roomId);

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const settingsApi = {
  getNotificationPreferences() {
    return apiRequest<NotificationPreferencesResponse>("/api/me/notification-preferences");
  },

  updateNotificationPreferences(body: NotificationPreferencesUpdateRequest) {
    return apiRequest<NotificationPreferencesResponse>("/api/me/notification-preferences", {
      body,
      method: "PATCH",
    });
  },

  getPrivacyConsents() {
    return apiRequest<PrivacyConsentsResponse>("/api/me/privacy-consents");
  },

  updatePrivacyConsents(body: PrivacyConsentsUpdateRequest) {
    return apiRequest<PrivacyConsentsResponse>("/api/me/privacy-consents", {
      body,
      method: "PATCH",
    });
  },

  getStorageUsage(params?: StorageUsageParams) {
    return apiRequest<StorageUsageResponse>(`/api/storage/usage${storageUsageQuery(params)}`);
  },
} as const;
