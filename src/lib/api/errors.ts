import type { ApiFailure } from "@/types/api/common";

export class ApiClientError extends Error {
  readonly code: string;
  readonly fields?: ApiFailure["error"]["fields"];
  readonly status: number;
  readonly traceId: string;

  constructor(status: number, failure: ApiFailure) {
    super(failure.error.message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = failure.error.code;
    this.traceId = failure.error.traceId;
    this.fields = failure.error.fields;
  }
}
