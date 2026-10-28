import type { ApiFailure } from "@/types/api/common";

export class ApiClientError extends Error {
  readonly code: string;
  readonly fields?: ApiFailure["error"]["fields"];
  readonly status: number;
  readonly traceId: string;
  readonly retryAfterMs: number | null;

  constructor(status: number, failure: ApiFailure, retryAfterMs: number | null = null) {
    super(failure?.error?.message ?? `HTTP ${status}`);
    this.name = "ApiClientError";
    this.status = status;
    this.code = failure?.error?.code ?? `HTTP_${status}`;
    this.traceId = failure?.error?.traceId ?? "";
    this.fields = failure?.error?.fields;
    this.retryAfterMs = retryAfterMs;
  }
}

export function parseRetryAfter(value: string | null, now = Date.now()): number | null {
  if (!value?.trim()) return null;
  if (/^\d+$/.test(value.trim())) {
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) && seconds <= Number.MAX_SAFE_INTEGER / 1000 ? seconds * 1000 : null;
  }
  if (!/^[A-Za-z]{3},\s/.test(value)) return null;
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, at - now) : null;
}
