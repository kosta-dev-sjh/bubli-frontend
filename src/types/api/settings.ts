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

// 백엔드 StorageScope enum(PERSONAL/ROOM) — StorageUsageItemResponse.storageScope 계약 값.
export type StorageScope = "PERSONAL" | "ROOM";

// 백엔드 StorageUsageItemResponse DTO와 1:1 매핑.
export type StorageUsageItemResponse = {
  id: string;
  limitBytes: number;
  remainingBytes: number;
  roomId?: string | null;
  storageScope: StorageScope;
  updatedAt?: string | null;
  usedBytes: number;
  userId: string;
};

// 백엔드 StorageUsageResponse DTO와 1:1 매핑 — 합계는 total* 필드로 내려온다(usedBytes/limitBytes 아님).
export type StorageUsageResponse = {
  totalLimitBytes: number;
  totalRemainingBytes: number;
  totalUsedBytes: number;
  usages: StorageUsageItemResponse[];
};

export type UserPreferenceResponse = {
  createdAt?: string | null;
  defaultHomeType?: string | null;
  defaultProjectRoomId?: string | null;
  // 직군 온보딩에서 고른 직군(user_preferences.job_role, backend PR 195).
  jobRole?: string | null;
  // 직군 온보딩(건너뛰기 포함)을 끝낸 시각(user_preferences.onboarding_completed_at, backend PR 195).
  onboardingCompletedAt?: string | null;
  theme?: string | null;
  updatedAt?: string | null;
  userId: string;
};

export type UserPreferenceUpdateRequest = {
  defaultHomeType?: string;
  defaultProjectRoomId?: string;
  jobRole?: string;
  onboardingCompletedAt?: string;
  theme?: string;
};
