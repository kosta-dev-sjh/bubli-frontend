export type PrivacyConsentsResponse = {
  activityDetectionEnabled: boolean;
  localFolderEnabled: boolean;
  personalAgentLocalMemoryEnabled: boolean;
  widgetUsageLocalEventEnabled: boolean;
};

export type PrivacyConsentsUpdateRequest = Partial<PrivacyConsentsResponse>;

export type ManagedFolderResponse = {
  createdAt: string;
  id: string;
  localPath?: string | null;
  name: string;
  syncEnabled: boolean;
  updatedAt: string;
};

export type ManagedFolderCreateRequest = {
  localPath?: string | null;
  name: string;
  syncEnabled?: boolean;
};

export type StorageUsageResponse = {
  limitBytes: number;
  roomId?: string | null;
  usedBytes: number;
};
