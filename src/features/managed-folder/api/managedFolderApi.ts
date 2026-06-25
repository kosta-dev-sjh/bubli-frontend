import { apiRequest } from "@/lib/api/client";
import type {
  LocalFileEventResponse,
  LocalFileEventSuggestRequest,
  LocalFileEventUpdateRequest,
  LocalFileResponse,
  LocalFileSyncResponse,
  ResourceShareToRoomRequest,
  ResourceSyncPolicyUpdateRequest,
} from "@/types/api/managedFolder";
import type { ResourceResponse } from "@/types/api/resource";

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

  shareResourceToRoom(resourceId: string, body: ResourceShareToRoomRequest) {
    return apiRequest<ResourceResponse>(`/api/resources/${resourceId}/share-to-room`, {
      body,
      method: "POST",
    });
  },

  restoreResource(resourceId: string) {
    return apiRequest<ResourceResponse>(`/api/resources/${resourceId}/restore`, {
      method: "POST",
    });
  },
} as const;
