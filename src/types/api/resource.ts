import type { PageResponse } from "@/types/api/common";

export type ResourceKind = "FILE" | "MEMO";

export type ResourceVisibility = "PERSONAL" | "ROOM_SHARED";

export type ResourceStatus = "UPLOADED" | "ANALYZING" | "ANALYZED" | "FAILED" | "ARCHIVED";

export type ResourceSummaryStatus = "NONE" | "PENDING" | "SUCCEEDED" | "FAILED";

export type AiDocumentStatus = "NONE" | "READY" | "ANALYZING" | "ANALYZED" | "FAILED";

export type ResourceVersionResponse = {
  createdAt: string;
  checksum?: string | null;
  createdBy?: string | null;
  fileId?: string | null;
  id: string;
  originalName: string;
  mimeType?: string | null;
  resourceId: string;
  sizeBytes?: number | null;
  storageKey?: string | null;
  versionNo: number;
};

export type ResourceResponse = {
  aiDocumentStatus?: AiDocumentStatus;
  createdAt: string;
  currentVersion?: ResourceVersionResponse | null;
  id: string;
  kind: ResourceKind;
  ownerId: string;
  roomId?: string | null;
  status: ResourceStatus;
  summaryStatus?: ResourceSummaryStatus;
  title: string;
  updatedAt: string;
  visibility: ResourceVisibility;
};

export type ResourceUpdateRequest = Partial<Pick<ResourceResponse, "status" | "title" | "visibility">>;

export type ResourceDownloadUrlResponse = {
  expiresAt: string;
  url: string;
};

export type ResourceSummaryResponse = {
  checklistJson?: string | null;
  createdAt: string;
  id: string;
  jobId?: string | null;
  modelName?: string | null;
  promptVersion?: string | null;
  resourceId: string;
  schemaVersion?: string | null;
  status: ResourceSummaryStatus;
  summaryJson?: string | null;
  updatedAt: string;
};

export type AiDocumentResponse = {
  documentType?: string | null;
  fields?: Record<string, unknown>;
  resourceId: string;
  status: AiDocumentStatus;
};

export type ResourceRelationResponse = {
  createdAt: string;
  id: string;
  reason?: string | null;
  relatedResourceId: string;
  resourceId: string;
  relatedResource: ResourceResponse;
  score?: number | null;
};

export type ResourceCommentResponse = {
  authorId: string;
  body: string;
  createdAt: string;
  id: string;
  parentId?: string | null;
  resourceId: string;
  updatedAt: string;
};

export type ResourceCommentRequest = {
  body: string;
};

export type ResourceUploadRequest = FormData;

export type ResourcePageResponse = PageResponse<ResourceResponse>;
export type ResourceCommentPageResponse = PageResponse<ResourceCommentResponse>;
export type ResourceRelationPageResponse = PageResponse<ResourceRelationResponse>;
export type ResourceVersionPageResponse = PageResponse<ResourceVersionResponse>;
