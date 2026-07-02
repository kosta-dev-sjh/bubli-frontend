export type LocalFileSyncStatus =
  | "LOCAL_ONLY"
  | "SYNC_PENDING"
  | "SYNCED"
  | "CONFLICT"
  | "SUGGESTED"
  | "IGNORED"
  | "FAILED";

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

export type LocalFileEventResponse = {
  eventType: "CREATED" | "UPDATED" | "DELETED" | "MOVED";
  id: string;
  localFileId?: string | null;
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SYNCED" | "FAILED";
};

export type LocalFileEventSyncRequest = {
  events: Array<{
    eventType: LocalFileEventResponse["eventType"];
    fileName: string;
    fileSizeBytes?: number | null;
    mimeType?: string | null;
    resourceId?: string | null;
  }>;
};

export type LocalFileEventUpdateRequest = {
  status: "APPROVED" | "REJECTED";
};

export type LocalFileSyncResponse = {
  results: Array<{
    eventType: LocalFileEventResponse["eventType"] | string;
    resourceId?: string | null;
    status: "SYNCED" | "SKIPPED" | "FAILED" | string;
  }>;
};

export type ResourceSyncPolicyUpdateRequest = {
  syncEnabled: boolean;
};
