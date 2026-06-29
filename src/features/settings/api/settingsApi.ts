import { apiRequest } from "@/lib/api/client";
import type {
  NotificationPreferencesResponse,
  NotificationPreferencesUpdateRequest,
} from "@/types/api/notification";
import type {
  ManagedFolderCreateRequest,
  ManagedFolderResponse,
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

  getManagedFolders() {
    return apiRequest<ManagedFolderResponse[]>("/api/me/managed-folders");
  },

  createManagedFolder(body: ManagedFolderCreateRequest) {
    return apiRequest<ManagedFolderResponse>("/api/me/managed-folders", {
      body,
      method: "POST",
    });
  },

  deleteManagedFolder(managedFolderId: string) {
    return apiRequest<null>(`/api/me/managed-folders/${managedFolderId}`, {
      method: "DELETE",
    });
  },

  getStorageUsage(params?: StorageUsageParams) {
    return apiRequest<StorageUsageResponse>(`/api/storage/usage${storageUsageQuery(params)}`);
  },
} as const;
