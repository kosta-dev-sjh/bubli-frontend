import { apiRequest } from "@/lib/api/client";
import type { AgentJobCreateResponse, AgentJobResponse } from "@/types/api/agent";

export type AnalyzeResourceRequest = {
  resourceId: string;
  projectRoomId?: string;
  idempotencyKey: string;
};

export const agentApi = {
  analyzeResource({ idempotencyKey, ...body }: AnalyzeResourceRequest) {
    return apiRequest<AgentJobCreateResponse>("/api/ai/analyze-resource", {
      body,
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      method: "POST",
    });
  },

  getJob(jobId: string) {
    return apiRequest<AgentJobResponse>(`/api/agent-jobs/${jobId}`);
  },
} as const;
