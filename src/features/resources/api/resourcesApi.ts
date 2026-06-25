import { apiRequest } from "@/lib/api/client";
import type {
  AiDocumentResponse,
  ResourceCommentRequest,
  ResourceCommentResponse,
  ResourceDownloadUrlResponse,
  ResourceRelationResponse,
  ResourceResponse,
  ResourceSummaryResponse,
  ResourceUpdateRequest,
  ResourceUploadRequest,
  ResourceVersionResponse,
} from "@/types/api/resource";

export const resourcesApi = {
  listPersonal() {
    return apiRequest<ResourceResponse[]>("/api/resources?scope=personal");
  },

  listRoomResources(roomId: string) {
    return apiRequest<ResourceResponse[]>(`/api/project-rooms/${roomId}/resources`);
  },

  upload(body: ResourceUploadRequest) {
    return apiRequest<ResourceResponse>("/api/resources", {
      body,
      method: "POST",
    });
  },

  uploadRoomDocument(roomId: string, body: ResourceUploadRequest) {
    return apiRequest<ResourceResponse>(`/api/project-rooms/${roomId}/documents`, {
      body,
      method: "POST",
    });
  },

  get(resourceId: string) {
    return apiRequest<ResourceResponse>(`/api/resources/${resourceId}`);
  },

  update(resourceId: string, body: ResourceUpdateRequest) {
    return apiRequest<ResourceResponse>(`/api/resources/${resourceId}`, {
      body,
      method: "PATCH",
    });
  },

  getDownloadUrl(resourceId: string) {
    return apiRequest<ResourceDownloadUrlResponse>(`/api/resources/${resourceId}/download-url`);
  },

  getSummary(resourceId: string) {
    return apiRequest<ResourceSummaryResponse>(`/api/resources/${resourceId}/summary`);
  },

  getAiDocument(resourceId: string) {
    return apiRequest<AiDocumentResponse>(`/api/resources/${resourceId}/ai-document`);
  },

  getRelated(resourceId: string) {
    return apiRequest<ResourceRelationResponse[]>(`/api/resources/${resourceId}/related`);
  },

  getVersions(resourceId: string) {
    return apiRequest<ResourceVersionResponse[]>(`/api/resources/${resourceId}/versions`);
  },

  uploadVersion(resourceId: string, body: ResourceUploadRequest) {
    return apiRequest<ResourceVersionResponse>(`/api/resources/${resourceId}/versions`, {
      body,
      method: "POST",
    });
  },

  getComments(resourceId: string) {
    return apiRequest<ResourceCommentResponse[]>(`/api/resources/${resourceId}/comments`);
  },

  createComment(resourceId: string, body: ResourceCommentRequest) {
    return apiRequest<ResourceCommentResponse>(`/api/resources/${resourceId}/comments`, {
      body,
      method: "POST",
    });
  },

  updateComment(commentId: string, body: ResourceCommentRequest) {
    return apiRequest<ResourceCommentResponse>(`/api/resource-comments/${commentId}`, {
      body,
      method: "PATCH",
    });
  },

  deleteComment(commentId: string) {
    return apiRequest<null>(`/api/resource-comments/${commentId}`, {
      method: "DELETE",
    });
  },

  delete(resourceId: string) {
    return apiRequest<null>(`/api/resources/${resourceId}`, {
      method: "DELETE",
    });
  },
} as const;
