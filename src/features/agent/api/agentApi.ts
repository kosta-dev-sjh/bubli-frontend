import { apiRequest } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/api/client";
import { getAuthAccessToken } from "@/lib/auth/auth-session";
import type {
  AgentDocumentDraftRequest,
  AgentJobEventPageResponse,
  AgentJobResponse,
  AgentResourceSearchRequest,
  AgentResourceSearchResponse,
  AgentSuggestionResponse,
  AgentSuggestionStatus,
  AgentSuggestionType,
  AgentSuggestionUpdateRequest,
  DailySummaryPageResponse,
  DailySummaryRequest,
  DailySummaryResponse,
  DailySummaryUpdateRequest,
  GeneratedDocumentExport,
  GeneratedDocumentPageResponse,
  GeneratedDocumentResponse,
} from "@/types/api/agent";

export type AnalyzeResourceRequest = {
  idempotencyKey: string;
  resourceId: string;
};

export type RoomAgentJobRequest = {
  roomId: string;
};

export type AgentSuggestionListParams = {
  status?: AgentSuggestionStatus;
  suggestionType?: AgentSuggestionType;
};

function suggestionQuery(params?: AgentSuggestionListParams) {
  const search = new URLSearchParams();

  if (params?.status) search.set("status", params.status);
  if (params?.suggestionType) search.set("suggestionType", params.suggestionType);

  const value = search.toString();
  return value ? `?${value}` : "";
}

export const agentApi = {
  analyzeResource({ idempotencyKey, resourceId }: AnalyzeResourceRequest) {
    return apiRequest<AgentJobResponse>("/api/ai/analyze-resource", {
      body: { resourceId },
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      method: "POST",
    });
  },

  generateRequirements(body: RoomAgentJobRequest) {
    return apiRequest<AgentJobResponse>("/api/ai/generate-requirements", {
      body,
      method: "POST",
    });
  },

  generateTasks(body: RoomAgentJobRequest) {
    return apiRequest<AgentJobResponse>("/api/ai/generate-tasks", {
      body,
      method: "POST",
    });
  },

  generateWbs(body: RoomAgentJobRequest) {
    return apiRequest<AgentJobResponse>("/api/ai/generate-wbs", {
      body,
      method: "POST",
    });
  },

  generateQuestions(body: RoomAgentJobRequest) {
    return apiRequest<AgentJobResponse>("/api/ai/generate-questions", {
      body,
      method: "POST",
    });
  },

  reviewContractDocuments(body: RoomAgentJobRequest) {
    return apiRequest<AgentJobResponse>("/api/ai/review-contract-documents", {
      body,
      method: "POST",
    });
  },

  getJob(jobId: string) {
    return apiRequest<AgentJobResponse>(`/api/agent-jobs/${jobId}`);
  },

  getJobEvents(jobId: string) {
    return apiRequest<AgentJobEventPageResponse>(`/api/agent-jobs/${jobId}/events`);
  },

  listPersonalSuggestions(params?: AgentSuggestionListParams) {
    return apiRequest<AgentSuggestionResponse[]>(`/api/agent/suggestions${suggestionQuery(params)}`);
  },

  listRoomSuggestions(roomId: string, params?: AgentSuggestionListParams) {
    return apiRequest<AgentSuggestionResponse[]>(`/api/project-rooms/${roomId}/agent/suggestions${suggestionQuery(params)}`);
  },

  listRoomConfirmationItems(roomId: string, params?: Pick<AgentSuggestionListParams, "status">) {
    return apiRequest<AgentSuggestionResponse[]>(`/api/project-rooms/${roomId}/agent/confirmation-items${suggestionQuery(params)}`);
  },

  listRoomConfirmedRequirements(roomId: string) {
    return apiRequest<AgentSuggestionResponse[]>(`/api/project-rooms/${roomId}/agent/confirmed-requirements`);
  },

  listRoomContractReferences(roomId: string) {
    return apiRequest<AgentSuggestionResponse[]>(`/api/project-rooms/${roomId}/agent/contract-references`);
  },

  updateSuggestion(suggestionId: string, body: AgentSuggestionUpdateRequest) {
    return apiRequest<AgentSuggestionResponse>(`/api/agent/suggestions/${suggestionId}`, {
      body,
      method: "PATCH",
    });
  },

  searchResources(body: AgentResourceSearchRequest) {
    return apiRequest<AgentResourceSearchResponse>("/api/ai/search-resource", {
      body,
      method: "POST",
    });
  },

  draftDocument(body: AgentDocumentDraftRequest) {
    return apiRequest<AgentJobResponse>("/api/ai/draft-document", {
      body,
      method: "POST",
    });
  },

  summarizeDay(body?: DailySummaryRequest) {
    return apiRequest<AgentJobResponse>("/api/ai/summarize-day", {
      body,
      method: "POST",
    });
  },

  listDailySummaries() {
    return apiRequest<DailySummaryPageResponse>("/api/daily-summaries");
  },

  updateDailySummary(summaryId: string, body: DailySummaryUpdateRequest) {
    return apiRequest<DailySummaryResponse>(`/api/daily-summaries/${summaryId}`, {
      body,
      method: "PATCH",
    });
  },

  listGeneratedDocuments() {
    return apiRequest<GeneratedDocumentPageResponse>("/api/generated-documents");
  },

  listRoomGeneratedDocuments(roomId: string) {
    return apiRequest<GeneratedDocumentPageResponse>(`/api/project-rooms/${roomId}/generated-documents`);
  },

  getGeneratedDocument(documentId: string) {
    return apiRequest<GeneratedDocumentResponse>(`/api/generated-documents/${documentId}`);
  },

  async exportGeneratedDocument(documentId: string): Promise<GeneratedDocumentExport> {
    const headers = new Headers();
    const accessToken = getAuthAccessToken();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(`${getApiBaseUrl()}/api/generated-documents/${documentId}/export`, {
      credentials: "include",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Generated document export failed with status ${response.status}`);
    }

    const disposition = response.headers.get("Content-Disposition") ?? "";
    const fileName = decodeURIComponent(disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? "generated-document.md");

    return {
      blob: await response.blob(),
      contentType: response.headers.get("Content-Type") ?? "text/markdown;charset=UTF-8",
      fileName,
    };
  },
} as const;
