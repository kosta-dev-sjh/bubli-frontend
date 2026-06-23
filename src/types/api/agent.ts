export type AgentJobStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";

export type AgentJobTargetType = "RESOURCE" | "PROJECT_ROOM" | "CHAT_ROOM" | "DAILY_SUMMARY" | "LOCAL_SYNC";

export type AgentJobCreateResponse = {
  jobId: string;
  status: AgentJobStatus;
  targetType: AgentJobTargetType;
  targetId: string;
};

export type AgentJobFailure = {
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
};

export type AgentJobResponse = AgentJobCreateResponse & {
  progress?: number;
  suggestionIds?: string[];
  resourceAnalysisId?: string | null;
  failure?: AgentJobFailure | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentJobStatusChangedPayload = {
  jobId: string;
  status: AgentJobStatus;
  targetType: AgentJobTargetType;
  targetId: string;
  progress?: number;
  failure?: AgentJobFailure | null;
  suggestionIds?: string[];
  resourceAnalysisId?: string | null;
};
