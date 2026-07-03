export type PrivacyConsentType = "ACTIVITY_CONTEXT" | "MANAGED_FOLDER";

export type PrivacyConsentsResponse = {
  activityDetectionEnabled: boolean;
  localFolderEnabled: boolean;
  personalAgentLocalMemoryEnabled: boolean;
  widgetUsageLocalEventEnabled: boolean;
};

export type PrivacyConsentsUpdateRequest = Partial<PrivacyConsentsResponse>;

export type PrivacyConsentsApiResponse = {
  items: Array<{
    consentType: PrivacyConsentType;
    enabled: boolean;
    updatedAt?: string | null;
  }>;
  userId: string;
};

export type PrivacyConsentsApiUpdateRequest = {
  items: Array<{
    consentType: PrivacyConsentType;
    enabled: boolean;
  }>;
};

export type ManagedFolderResponse = {
  createdAt: string;
  id: string;
  localPath?: string | null;
  name: string;
  syncEnabled: boolean;
  updatedAt: string;
};

export type StorageUsageResponse = {
  limitBytes: number;
  roomId?: string | null;
  usedBytes: number;
};
