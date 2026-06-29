export type AgentJobStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";

export type AgentJobTargetType = "RESOURCE" | "PROJECT_ROOM" | "DAILY_SUMMARY";

export type AgentJobType =
  | "RESOURCE_ANALYSIS"
  | "DOCUMENT_REVIEW"
  | "REQUIREMENT_SUGGESTION"
  | "WBS_SUGGESTION"
  | "TASK_SUGGESTION"
  | "SCHEDULE_SUGGESTION"
  | "DAILY_SUMMARY"
  | "RESOURCE_SEARCH"
  | "DOCUMENT_DRAFT";

export type AgentJobCreateRequest = {
  jobType: AgentJobType;
  options?: Record<string, unknown>;
  resourceIds?: string[];
  roomId?: string | null;
  targetId?: string | null;
  targetType: AgentJobTargetType;
};

export type AgentJobResponse = {
  aiDocumentId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  jobId: string;
  resourceSummaryId?: string | null;
  retryable: boolean;
  status: AgentJobStatus;
  suggestionIds: string[];
  targetId?: string | null;
  targetType: string;
};

export type AgentJobStatusChangedPayload = {
  aiDocumentId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  jobId: string;
  resourceSummaryId?: string | null;
  retryable?: boolean;
  status: AgentJobStatus;
  targetId?: string | null;
  targetType: string;
  suggestionIds?: string[];
};

export type AgentSuggestionStatus = "PENDING" | "APPROVED" | "EDITED" | "HELD" | "DELETED";

export type AgentSuggestionType =
  | "REQUIREMENT"
  | "WBS"
  | "TASK"
  | "SCHEDULE"
  | "QUESTION"
  | "EXTRACTED_FIELD"
  | "RESOURCE";

export type AgentSuggestionResponse = {
  content: Record<string, unknown>;
  createdAt: string;
  id: string;
  jobId?: string | null;
  resourceId?: string | null;
  roomId?: string | null;
  status: AgentSuggestionStatus;
  suggestionType: AgentSuggestionType;
  updatedAt: string;
};

export type AgentSuggestionUpdateRequest = {
  content?: Record<string, unknown>;
  status: Extract<AgentSuggestionStatus, "APPROVED" | "EDITED" | "HELD" | "DELETED">;
};

export type AgentResourceSearchRequest = {
  query: string;
  roomId?: string | null;
};

export type AgentResourceSearchResponse = {
  reason?: string | null;
  resourceId: string;
  score?: number | null;
  title: string;
};

export type AgentDocumentDraftRequest = {
  prompt: string;
  resourceIds?: string[];
  roomId?: string | null;
};

export type AgentDocumentDraftResponse = {
  draft: string;
  jobId?: string | null;
};

export type DailySummaryStatus = "PENDING" | "APPROVED" | "HELD";

export type DailySummaryResponse = {
  content: Record<string, unknown>;
  id: string;
  status: DailySummaryStatus;
  summaryDate: string;
  updatedAt: string;
};

export type DailySummaryUpdateRequest = {
  content?: Record<string, unknown>;
  status: DailySummaryStatus;
};
