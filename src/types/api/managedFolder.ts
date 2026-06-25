import type { ResourceResponse } from "@/types/api/resource";

export type LocalFileSyncStatus = "LOCAL_ONLY" | "SUGGESTED" | "SYNCED" | "IGNORED" | "FAILED";

export type LocalFileResponse = {
  fileName: string;
  id: string;
  localFolderId: string;
  localPath: string;
  resourceId?: string | null;
  sizeBytes?: number | null;
  syncStatus: LocalFileSyncStatus;
  updatedAt: string;
};

export type LocalFileEventStatus = "PENDING" | "APPROVED" | "REJECTED" | "SYNCED" | "FAILED";

export type LocalFileEventResponse = {
  eventType: "CREATED" | "UPDATED" | "DELETED" | "MOVED";
  id: string;
  localFileId?: string | null;
  reason?: string | null;
  status: LocalFileEventStatus;
};

export type LocalFileEventSuggestRequest = {
  events: Array<{
    eventType: LocalFileEventResponse["eventType"];
    fileName: string;
    hash?: string | null;
    localFolderId: string;
    localPath: string;
    modifiedAt?: string | null;
    sizeBytes?: number | null;
  }>;
};

export type LocalFileEventUpdateRequest = {
  status: "APPROVED" | "REJECTED";
};

export type LocalFileSyncResponse = {
  failedCount: number;
  resources: ResourceResponse[];
  syncedCount: number;
};

export type ResourceSyncPolicyUpdateRequest = {
  syncEnabled: boolean;
};

export type ResourceShareToRoomRequest = {
  roomId: string;
};
