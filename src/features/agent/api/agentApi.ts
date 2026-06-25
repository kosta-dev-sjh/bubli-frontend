import { apiRequest } from "@/lib/api/client";
import type { AgentJobCreateRequest, AgentJobResponse } from "@/types/api/agent";

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
} as const;
