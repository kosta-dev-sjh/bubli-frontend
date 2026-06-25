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
