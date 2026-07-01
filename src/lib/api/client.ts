import { ApiClientError } from "@/lib/api/errors";
import {
  clearStoredAuthSession,
  getAuthAccessToken,
  getAuthClientType,
  getAuthRefreshToken,
  setStoredAuthSession,
} from "@/lib/auth/auth-session";
import type { AuthTokenResponse } from "@/types/api/auth";
import type { ApiFailure, ApiResponse } from "@/types/api/common";

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const DEFAULT_API_TIMEOUT_MS = 15000;
const PREVIEW_API_TIMEOUT_MS = 1200;

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
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
  const { body, headers, skipAuth = false, skipAuthRefresh = false, ...init } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const timeoutController = init.signal ? null : new AbortController();
  const timeoutId = timeoutController ? setTimeout(() => timeoutController.abort(), getApiTimeoutMs()) : null;

  try {
    const first = await sendApiRequest<T>(path, {
      body,
      headers,
      init,
      isFormData,
      signal: init.signal ?? timeoutController?.signal,
      skipAuth,
    });

    if (first.ok) {
      return first.payload.data;
    }

    if (first.response.status === 401 && !skipAuthRefresh) {
      const refreshed = await refreshAuthSession();
      if (refreshed) {
        const retry = await sendApiRequest<T>(path, {
          body,
          headers,
          init,
          isFormData,
          signal: init.signal ?? timeoutController?.signal,
          skipAuth,
        });

        if (retry.ok) {
          return retry.payload.data;
        }

        throw new ApiClientError(retry.response.status, retry.payload as ApiFailure);
      }
    }

    throw new ApiClientError(first.response.status, first.payload as ApiFailure);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

type SendApiRequestInput = {
  body: unknown;
  headers: HeadersInit | undefined;
  init: Omit<RequestInit, "body" | "headers">;
  isFormData: boolean;
  signal?: AbortSignal | null;
  skipAuth: boolean;
};

type SendApiRequestResult<T> =
  | { ok: true; payload: ApiResponse<T> & { success: true }; response: Response }
  | { ok: false; payload: ApiFailure; response: Response };

async function sendApiRequest<T>(
  path: string,
  input: SendApiRequestInput,
): Promise<SendApiRequestResult<T>> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...input.init,
    credentials: input.init.credentials ?? "include",
    headers: buildHeaders(input.headers, input.isFormData, input.skipAuth),
    body: serializeBody(input.body, input.isFormData),
    signal: input.signal ?? undefined,
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    return {
      ok: false,
      payload: payload as ApiFailure,
      response,
    };
  }

  return {
    ok: true,
    payload,
    response,
  };
}

function buildHeaders(headers: HeadersInit | undefined, isFormData: boolean, skipAuth: boolean) {
  const next = new Headers(headers);

  if (!isFormData && !next.has("Content-Type")) {
    next.set("Content-Type", "application/json");
  }

  const accessToken = skipAuth ? null : getAuthAccessToken();
  if (accessToken && !next.has("Authorization")) {
    next.set("Authorization", `Bearer ${accessToken}`);
  }

  return next;
}

function serializeBody(body: unknown, isFormData: boolean) {
  if (body === undefined) {
    return undefined;
  }

  return isFormData ? (body as BodyInit) : JSON.stringify(body);
}

let refreshPromise: Promise<boolean> | null = null;

function refreshAuthSession() {
  refreshPromise ??= refreshAuthSessionOnce().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function refreshAuthSessionOnce() {
  const refreshToken = getAuthRefreshToken();
  if (!refreshToken) {
    clearStoredAuthSession();
    return false;
  }

  try {
    const clientType = getAuthClientType();
    const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
      body: JSON.stringify({ clientType, refreshToken }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json()) as ApiResponse<AuthTokenResponse>;

    if (!response.ok || !payload.success) {
      clearStoredAuthSession();
      return false;
    }

    setStoredAuthSession({ ...payload.data, clientType });
    return true;
  } catch {
    clearStoredAuthSession();
    return false;
  }
}
