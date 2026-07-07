import { apiRequest } from "@/lib/api/client";
import type {
  AiDocumentResponse,
  ResourceCommentRequest,
  ResourceCommentResponse,
  ResourceDownloadUrlResponse,
  ResourceCommentPageResponse,
  ResourcePageResponse,
  ResourceRelationPageResponse,
  ResourceResponse,
  ResourceSummaryResponse,
  ResourceUpdateRequest,
  ResourceUploadRequest,
  ResourceVersionPageResponse,
  ResourceVersionResponse,
} from "@/types/api/resource";

export const resourcesApi = {
  listPersonal() {
    return apiRequest<ResourcePageResponse>("/api/resources?scope=personal");
  },

  // 로컬 폴더 해제 정리처럼 개인 자료 전체를 훑어야 할 때 쓰는 페이지 조회.
  // 기본 목록(listPersonal)은 서버 기본 페이지 크기(20건)만 내려와서 전체 순회에 못 쓴다.
  listPersonalPage(page = 0, size = 100) {
    return apiRequest<ResourcePageResponse>(`/api/resources?scope=personal&page=${page}&size=${size}`);
  },

  listRoomResources(roomId: string) {
    return apiRequest<ResourcePageResponse>(`/api/project-rooms/${roomId}/resources`);
  },

  listRoomResourcesPage(roomId: string, page = 0, size = 100) {
    return apiRequest<ResourcePageResponse>(`/api/project-rooms/${roomId}/resources?page=${page}&size=${size}`);
  },

  upload(body: ResourceUploadRequest) {
    return apiRequest<ResourceResponse>("/api/resources", {
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
    return apiRequest<ResourceRelationPageResponse>(`/api/resources/${resourceId}/related`);
  },

  getVersions(resourceId: string) {
    return apiRequest<ResourceVersionPageResponse>(`/api/resources/${resourceId}/versions`);
  },

  // 주의: 백엔드 POST /api/resources/{id}/versions 는 현재 JSON 메타데이터
  // (storageKey·originalName·mimeType·sizeBytes)만 받는다(CreateResourceVersionRequest).
  // 웹에는 파일 바이트를 스토리지에 올릴 별도 경로가 없어 multipart 요청은 거절된다 —
  // 호출부(resource-board-common)에서 이 경우를 안내 문구로 처리한다.
  uploadVersion(resourceId: string, body: ResourceUploadRequest) {
    return apiRequest<ResourceVersionResponse>(`/api/resources/${resourceId}/versions`, {
      body,
      method: "POST",
    });
  },

  getComments(resourceId: string) {
    return apiRequest<ResourceCommentPageResponse>(`/api/resources/${resourceId}/comments`);
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
