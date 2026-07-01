import type { PageResponse } from "./common";

export type AgentJobStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";

export type AgentJobType =
  | "ANALYZE_RESOURCE"
  | "GENERATE_WBS"
  | "GENERATE_TASKS"
  | "GENERATE_REQUIREMENTS"
  | "REVIEW_CONTRACT_DOCUMENTS"
  | "GENERATE_QUESTIONS"
  | "DAILY_SUMMARY"
  | "DOCUMENT_DRAFT";

export type AgentJobResponse = {
  aiDocumentId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  finishedAt?: string | null;
  jobType: AgentJobType;
  jobId: string;
  resourceId?: string | null;
  resourceSummaryId?: string | null;
  retryCount: number;
  roomId?: string | null;
  startedAt?: string | null;
  status: AgentJobStatus;
  suggestionIds: string[];
};

export type AgentJobStatusChangedPayload = {
  aiDocumentId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  finishedAt?: string | null;
  jobType?: AgentJobType;
  jobId: string;
  resourceId?: string | null;
  resourceSummaryId?: string | null;
  retryCount?: number;
  roomId?: string | null;
  startedAt?: string | null;
  status: AgentJobStatus;
  suggestionIds?: string[];
};

export type AgentJobEventResponse = {
  createdAt: string;
  eventType: string;
  id: string;
  jobId: string;
  message?: string | null;
};

export type AgentJobEventPageResponse = PageResponse<AgentJobEventResponse>;

export type AgentSuggestionStatus = "DRAFT" | "APPROVED" | "HELD" | "REJECTED";

export type AgentSuggestionType =
  | "REQUIREMENT"
  | "TODO"
  | "WBS"
  | "TASK"
  | "SCHEDULE"
  | "QUESTION"
  | "CONTRACT_FIELD"
  | "CONTRACT_REVIEW"
  | "REVIEW_ITEM"
  | "DOCUMENT_DRAFT"
  | "DAILY_SUMMARY"
  | "MEMO";

export type AgentSuggestionResponse = {
  createdAt: string;
  evidenceJson: Record<string, unknown>;
  jobId: string | null;
  payloadJson: Record<string, unknown>;
  resourceId: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  roomId: string | null;
  suggestionId: string;
  status: AgentSuggestionStatus;
  suggestionType: AgentSuggestionType;
  updatedAt: string;
  userId: string;
};

export type AgentSuggestionReviewAction = "APPROVE" | "EDIT" | "HOLD" | "REJECT" | "DELETE" | "MODIFY";

export type AgentSuggestionUpdateRequest = {
  action: AgentSuggestionReviewAction;
  editedContent?: Record<string, unknown>;
  payloadJson?: Record<string, unknown>;
};

export type GeneratedDocumentResponse = {
  contentMarkdown: string;
  createdAt: string;
  documentType: string;
  id: string;
  metadataJson: Record<string, unknown>;
  resourceId: string | null;
  roomId: string | null;
  suggestionId: string | null;
  title: string;
  updatedAt: string;
  userId: string;
};

export type GeneratedDocumentPageResponse = PageResponse<GeneratedDocumentResponse>;

export type GeneratedDocumentExport = {
  blob: Blob;
  contentType: string;
  fileName: string;
};

export type AgentResourceSearchScope = "ROOM_SHARED" | "PERSONAL";

export type AgentResourceSearchRequest = {
  query: string;
  scope?: AgentResourceSearchScope;
  roomId?: string | null;
  topK?: number;
};

export type AgentResourceSearchHit = {
  chunkIndex: number;
  chunkMetadata?: string | null;
  chunkText: string;
  embeddingId: string;
  pageNumber?: number | null;
  resourceId: string;
  similarityScore: number;
};

export type AgentResourceSearchResponse = {
  hits: AgentResourceSearchHit[];
};

export type AgentDocumentDraftRequest = {
  documentType?: string | null;
  instruction?: string | null;
  roomId: string;
  sourceResourceIds?: string[];
};

export type DailySummaryRequest = {
  summaryDate?: string;
};

export type DailySummaryStatus = "DRAFT" | "APPROVED";

export type DailySummaryResponse = {
  approvedAt?: string | null;
  createdAt: string;
  id: string;
  summaryDate: string;
  summaryJson: string;
  status: DailySummaryStatus;
  userId: string;
  updatedAt: string;
};

export type DailySummaryPageResponse = PageResponse<DailySummaryResponse>;

export type DailySummaryAction = "APPROVE" | "EDIT" | "HOLD";

export type DailySummaryUpdateRequest = {
  action: DailySummaryAction;
  summaryJson?: string | null;
};
