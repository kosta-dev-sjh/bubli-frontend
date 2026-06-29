import { apiRequest } from "@/lib/api/client";
import type {
  AgentDocumentDraftRequest,
  AgentDocumentDraftResponse,
  AgentJobCreateRequest,
  AgentJobResponse,
  AgentResourceSearchRequest,
  AgentResourceSearchResponse,
  AgentSuggestionResponse,
  AgentSuggestionUpdateRequest,
  DailySummaryResponse,
  DailySummaryUpdateRequest,
} from "@/types/api/agent";

export type AnalyzeResourceRequest = {
  idempotencyKey: string;
  resourceId: string;
  roomId?: string;
};

export type CreateAgentJobRequest = AgentJobCreateRequest & {
  idempotencyKey: string;
};

export const agentApi = {
  createJob({ idempotencyKey, ...body }: CreateAgentJobRequest) {
    return apiRequest<AgentJobResponse>("/api/agent/jobs", {
      body,
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      method: "POST",
    });
  },

  analyzeResource({ idempotencyKey, resourceId, roomId }: AnalyzeResourceRequest) {
    return agentApi.createJob({
      idempotencyKey,
      jobType: "RESOURCE_ANALYSIS",
      resourceIds: [resourceId],
      roomId: roomId ?? null,
      targetId: resourceId,
      targetType: "RESOURCE",
    });
  },

  getJob(jobId: string) {
    return apiRequest<AgentJobResponse>(`/api/agent/jobs/${jobId}`);
  },

  getJobEvents(jobId: string) {
    return apiRequest<unknown[]>(`/api/agent/jobs/${jobId}/events`);
  },

  listPersonalSuggestions() {
    return apiRequest<AgentSuggestionResponse[]>("/api/agent/suggestions");
  },

  listRoomSuggestions(roomId: string) {
    return apiRequest<AgentSuggestionResponse[]>(`/api/project-rooms/${roomId}/agent/suggestions`);
  },

  updateSuggestion(suggestionId: string, body: AgentSuggestionUpdateRequest) {
    return apiRequest<AgentSuggestionResponse>(`/api/agent/suggestions/${suggestionId}`, {
      body,
      method: "PATCH",
    });
  },

  searchResources(body: AgentResourceSearchRequest) {
    return apiRequest<AgentResourceSearchResponse[]>("/api/agent/search-resources", {
      body,
      method: "POST",
    });
  },

  draftDocument(body: AgentDocumentDraftRequest) {
    return apiRequest<AgentDocumentDraftResponse>("/api/agent/draft-document", {
      body,
      method: "POST",
    });
  },

  summarizeDay(body: Record<string, unknown>) {
    return apiRequest<AgentJobResponse>("/api/agent/summarize-day", {
      body,
      method: "POST",
    });
  },

  listDailySummaries() {
    return apiRequest<DailySummaryResponse[]>("/api/daily-summaries");
  },

  updateDailySummary(summaryId: string, body: DailySummaryUpdateRequest) {
    return apiRequest<DailySummaryResponse>(`/api/daily-summaries/${summaryId}`, {
      body,
      method: "PATCH",
    });
  },
} as const;
