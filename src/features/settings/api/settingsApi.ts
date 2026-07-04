import { apiRequest } from "@/lib/api/client";
import type {
  NotificationPreferencesResponse,
  NotificationPreferencesUpdateRequest,
} from "@/types/api/notification";
import type {
  PrivacyConsentsApiResponse,
  PrivacyConsentsApiUpdateRequest,
  PrivacyConsentsResponse,
  PrivacyConsentsUpdateRequest,
  StorageUsageResponse,
  UserPreferenceResponse,
  UserPreferenceUpdateRequest,
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

function normalizePrivacyConsents(response: PrivacyConsentsApiResponse): PrivacyConsentsResponse {
  const enabled = new Map(response.items.map((item) => [item.consentType, item.enabled]));

  return {
    activityDetectionEnabled: enabled.get("ACTIVITY_CONTEXT") ?? false,
    localFolderEnabled: enabled.get("MANAGED_FOLDER") ?? false,
    personalAgentLocalMemoryEnabled: false,
    widgetUsageLocalEventEnabled: false,
  };
}

function toPrivacyConsentsApiUpdate(body: PrivacyConsentsUpdateRequest): PrivacyConsentsApiUpdateRequest {
  const items: PrivacyConsentsApiUpdateRequest["items"] = [];

  if (body.activityDetectionEnabled !== undefined) {
    items.push({
      consentType: "ACTIVITY_CONTEXT",
      enabled: body.activityDetectionEnabled,
    });
  }

  if (body.localFolderEnabled !== undefined) {
    items.push({
      consentType: "MANAGED_FOLDER",
      enabled: body.localFolderEnabled,
    });
  }

  return { items };
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

  async getPrivacyConsents() {
    const response = await apiRequest<PrivacyConsentsApiResponse>("/api/me/privacy-consents");
    return normalizePrivacyConsents(response);
  },

  async updatePrivacyConsents(body: PrivacyConsentsUpdateRequest) {
    const apiBody = toPrivacyConsentsApiUpdate(body);
    if (apiBody.items.length === 0) {
      return settingsApi.getPrivacyConsents();
    }

    const response = await apiRequest<PrivacyConsentsApiResponse>("/api/me/privacy-consents", {
      body: apiBody,
      method: "PATCH",
    });
    return normalizePrivacyConsents(response);
  },

  getStorageUsage(params?: StorageUsageParams) {
    return apiRequest<StorageUsageResponse>(`/api/storage/usage${storageUsageQuery(params)}`);
  },

  getPreferences() {
    return apiRequest<UserPreferenceResponse>("/api/me/preferences");
  },

  updatePreferences(body: UserPreferenceUpdateRequest) {
    return apiRequest<UserPreferenceResponse>("/api/me/preferences", {
      body,
      method: "PATCH",
    });
  },
} as const;
