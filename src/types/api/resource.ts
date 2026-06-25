export type ResourceKind = "FILE" | "MEMO";

export type ResourceVisibility = "PERSONAL" | "ROOM_SHARED";

export type ResourceStatus = "UPLOADED" | "ANALYZING" | "ANALYZED" | "FAILED" | "ARCHIVED";

export type ResourceSummaryStatus = "NONE" | "PENDING" | "SUCCEEDED" | "FAILED";

export type AiDocumentStatus = "NONE" | "READY" | "ANALYZING" | "ANALYZED" | "FAILED";

export type ResourceVersionResponse = {
  createdAt: string;
  fileName: string;
  id: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
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
  resourceId: string;
  status: ResourceSummaryStatus;
  summary?: string | null;
  updatedAt?: string | null;
};

export type AiDocumentResponse = {
  documentType?: string | null;
  fields?: Record<string, unknown>;
  resourceId: string;
  status: AiDocumentStatus;
};

export type ResourceRelationResponse = {
  reason?: string | null;
  relatedResource: ResourceResponse;
  score?: number | null;
};

export type ResourceCommentResponse = {
  author: {
    avatarUrl?: string | null;
    id: string;
    name: string;
  };
  body: string;
  createdAt: string;
  id: string;
  resourceId: string;
  updatedAt: string;
};

export type ResourceCommentRequest = {
  body: string;
};

export type ResourceUploadRequest = FormData;
