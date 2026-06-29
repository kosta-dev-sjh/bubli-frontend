import { apiRequest } from "@/lib/api/client";
import type {
  HeartbeatTimeLogRequest,
  StartTimeLogRequest,
  StopTimeLogRequest,
  TimeLogResponse,
  TimeLogTransitionRequest,
} from "@/types/api/timer";

function idempotencyHeaders(idempotencyKey?: string) {
  return idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
}

export const timerApi = {
  start({ idempotencyKey, ...body }: StartTimeLogRequest) {
    return apiRequest<TimeLogResponse>("/api/time-logs/start", {
      body,
      headers: idempotencyHeaders(idempotencyKey),
      method: "POST",
    });
  },

  pause(timeLogId: string, { idempotencyKey, ...body }: TimeLogTransitionRequest = {}) {
    return apiRequest<TimeLogResponse>(`/api/time-logs/${timeLogId}/pause`, {
      body,
      headers: idempotencyHeaders(idempotencyKey),
      method: "PATCH",
    });
  },

  resume(timeLogId: string, { idempotencyKey, ...body }: TimeLogTransitionRequest = {}) {
    return apiRequest<TimeLogResponse>(`/api/time-logs/${timeLogId}/resume`, {
      body,
      headers: idempotencyHeaders(idempotencyKey),
      method: "PATCH",
    });
  },

  stop(timeLogId: string, { idempotencyKey, ...body }: StopTimeLogRequest = {}) {
    return apiRequest<TimeLogResponse>(`/api/time-logs/${timeLogId}/stop`, {
      body,
      headers: idempotencyHeaders(idempotencyKey),
      method: "PATCH",
    });
  },

  heartbeat(timeLogId: string, { idempotencyKey, ...body }: HeartbeatTimeLogRequest = {}) {
    return apiRequest<TimeLogResponse>(`/api/time-logs/${timeLogId}/heartbeat`, {
      body,
      headers: idempotencyHeaders(idempotencyKey),
      method: "PATCH",
    });
  },
} as const;
