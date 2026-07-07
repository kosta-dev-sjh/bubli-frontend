import { ApiClientError } from "@/lib/api/errors";
import {
  clearStoredAuthSession,
  getAuthAccessToken,
  getAuthClientType,
  getAuthRefreshToken,
  setStoredAuthSession,
  setStoredAuthSessionAndWaitForTauriMirror,
} from "@/lib/auth/auth-session";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import type { AuthTokenResponse } from "@/types/api/auth";
import type { ApiFailure, ApiResponse } from "@/types/api/common";

const DEFAULT_LOCAL_API_BASE_URL = "http://localhost:8080";
const DEFAULT_PRODUCTION_API_BASE_URL = "https://bubli.n-e.kr";
const DEFAULT_API_TIMEOUT_MS = 15000;
const PREVIEW_API_TIMEOUT_MS = 1200;

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
};

export function getApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (process.env.NODE_ENV === "production" ? DEFAULT_PRODUCTION_API_BASE_URL : DEFAULT_LOCAL_API_BASE_URL)
  );
}

function getApiTimeoutMs() {
  const configured = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  if (
    !isTauriRuntime() &&
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_BUBLI_PREVIEW_DATA === "true"
  ) {
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
      if (refreshed === "refreshed") {
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

      if (refreshed === "unavailable") {
        throw new Error("Auth refresh is temporarily unavailable.");
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

type AuthRefreshResult = "invalid" | "refreshed" | "unavailable";

let refreshPromise: Promise<AuthRefreshResult> | null = null;

function refreshAuthSession() {
  refreshPromise ??= refreshAuthSessionOnce().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function isRefreshTokenRejected(status: number, payload: ApiResponse<AuthTokenResponse> | null) {
  if (status === 401 || status === 403) return true;

  const code = payload?.success === false ? payload.error.code : null;
  return code === "AUTH_REFRESH_TOKEN_EXPIRED" || code === "AUTH_REFRESH_TOKEN_REUSED" || code === "AUTH_INVALID_TOKEN";
}

async function refreshAuthSessionOnce(): Promise<AuthRefreshResult> {
  // 웹에서 탭을 여러 개 열면 같은 refresh 토큰으로 동시에 갱신을 시도한다. 백엔드는 refresh
  // 토큰을 1회용으로 회전시키므로 늦은 쪽이 "재사용" 거절을 받고 공용 localStorage 세션을
  // 지워 모든 탭이 로그아웃돼 버렸다. Web Locks로 탭 간 갱신을 직렬화한다.
  if (typeof navigator !== "undefined" && navigator.locks) {
    try {
      return await navigator.locks.request("bubli-auth-refresh", () => performAuthRefresh());
    } catch {
      return performAuthRefresh();
    }
  }
  return performAuthRefresh();
}

async function performAuthRefresh(): Promise<AuthRefreshResult> {
  const refreshToken = getAuthRefreshToken();
  if (!refreshToken) {
    clearStoredAuthSession();
    return "invalid";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getApiTimeoutMs());

  try {
    const clientType = getAuthClientType();
    const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
      body: JSON.stringify({ clientType, refreshToken }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as ApiResponse<AuthTokenResponse> | null;

    if (response.ok && payload?.success) {
      if (isTauriRuntime()) {
        await setStoredAuthSessionAndWaitForTauriMirror({ ...payload.data, clientType });
      } else {
        setStoredAuthSession({ ...payload.data, clientType });
      }
      return "refreshed";
    }

    if (isRefreshTokenRejected(response.status, payload)) {
      // 거절이더라도 다른 탭이 방금 세션을 회전시켰다면(저장된 토큰이 우리가 보낸 것과 다름)
      // 그 새 세션을 그대로 쓴다 — 세션을 지우면 멀쩡히 로그인된 다른 탭까지 로그아웃된다.
      if (getAuthRefreshToken() !== refreshToken) {
        return "refreshed";
      }
      clearStoredAuthSession();
      return "invalid";
    }

    return "unavailable";
  } catch {
    return "unavailable";
  } finally {
    clearTimeout(timeoutId);
  }
}
