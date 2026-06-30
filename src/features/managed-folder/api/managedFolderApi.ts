import { apiRequest } from "@/lib/api/client";
import type {
  LocalFileEventResponse,
  LocalFileEventSuggestRequest,
  LocalFileEventUpdateRequest,
  LocalFileResponse,
  LocalFileSyncResponse,
  ResourceSyncPolicyUpdateRequest,
} from "@/types/api/managedFolder";
import type { ResourceResponse } from "@/types/api/resource";

// Personal managed-folder flow. Boundary (10_API-Design 14.6, Data Model 13.2):
// only POST /api/local-file-events/sync reflects approved local changes to the
// personal library. Personal files are never auto-shared into a project room,
// and there is no resource restore endpoint (delete is permanent).
//
// The suggest / approve / list / sync-policy endpoints below are a client flow
// not yet pinned in the API spec; treat them as pending backend confirmation.
export const managedFolderApi = {
  listLocalFiles() {
    return apiRequest<LocalFileResponse[]>("/api/local-files");
  },

  suggestLocalFileEvents(body: LocalFileEventSuggestRequest) {
    return apiRequest<LocalFileEventResponse[]>("/api/local-file-events/suggest", {
      body,
      method: "POST",
    });
  },

  updateLocalFileEvent(eventId: string, body: LocalFileEventUpdateRequest) {
    return apiRequest<LocalFileEventResponse>(`/api/local-file-events/${eventId}`, {
      body,
      method: "PATCH",
    });
  },

  syncApprovedLocalFileEvents() {
    return apiRequest<LocalFileSyncResponse>("/api/local-file-events/sync", {
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
