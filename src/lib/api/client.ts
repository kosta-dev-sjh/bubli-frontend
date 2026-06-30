import { ApiClientError } from "@/lib/api/errors";
import type { ApiFailure, ApiResponse } from "@/types/api/common";

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const DEFAULT_API_TIMEOUT_MS = 15000;
const PREVIEW_API_TIMEOUT_MS = 1200;

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

function getApiTimeoutMs() {
  const configured = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_BUBLI_PREVIEW_DATA !== "false") {
    return PREVIEW_API_TIMEOUT_MS;
  }

  return DEFAULT_API_TIMEOUT_MS;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, headers, ...init } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const timeoutController = init.signal ? null : new AbortController();
  const timeoutId = timeoutController ? setTimeout(() => timeoutController.abort(), getApiTimeoutMs()) : null;

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      credentials: init.credentials ?? "include",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal: init.signal ?? timeoutController?.signal,
    });

    const payload = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !payload.success) {
      throw new ApiClientError(response.status, payload as ApiFailure);
    }

    return payload.data;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
