import { ApiClientError } from "@/lib/api/errors";
import type { ApiFailure, ApiResponse } from "@/types/api/common";

const DEFAULT_API_BASE_URL = "http://localhost:8080";

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, headers, ...init } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: init.credentials ?? "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    throw new ApiClientError(response.status, payload as ApiFailure);
  }

  return payload.data;
}
