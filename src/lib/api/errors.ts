import type { ApiFailure } from "@/types/api/common";

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly traceId?: string;
  readonly details?: unknown;

  constructor(status: number, failure: ApiFailure) {
    super(failure.error.message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = failure.error.code;
    this.traceId = failure.error.traceId;
    this.details = failure.error.details;
  }
}
