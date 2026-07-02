import { apiRequest } from "@/lib/api/client";
import type {
  LocalFileEventSyncRequest,
  LocalFileSyncResponse,
  ResourceSyncPolicyUpdateRequest,
} from "@/types/api/managedFolder";
import type { ResourceResponse } from "@/types/api/resource";

// Personal managed-folder flow. Boundary (10_API-Design 14.6, Data Model 13.2):
// only POST /api/local-file-events/sync reflects approved local changes to the
// personal library. Personal files are never auto-shared into a project room,
// and there is no resource restore endpoint (delete is permanent).
export const managedFolderApi = {
  syncApprovedLocalFileEvents(body: LocalFileEventSyncRequest) {
    return apiRequest<LocalFileSyncResponse>("/api/local-file-events/sync", {
      body,
      method: "POST",
    });
  },

  updateResourceSyncPolicy(resourceId: string, body: ResourceSyncPolicyUpdateRequest) {
    return apiRequest<ResourceResponse>(`/api/resources/${resourceId}/sync-policy`, {
      body,
      method: "PATCH",
    });
  },
} as const;
