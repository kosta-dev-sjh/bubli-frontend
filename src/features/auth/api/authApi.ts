import { apiRequest } from "@/lib/api/client";
import {
  clearStoredAuthSession,
  getAuthClientType,
  getAuthRedirectUri,
  getAuthRefreshToken,
  setStoredAuthSession,
  setStoredAuthSessionAndWaitForTauriMirror,
  updateStoredAuthSessionUser,
} from "@/lib/auth/auth-session";
import { readExplicitStoredLocale } from "@/lib/i18n";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import type {
  AuthClientType,
  AuthRefreshResponse,
  AuthTokenResponse,
  AuthUser,
  GoogleAuthorizeResponse,
  GoogleCallbackRequest,
} from "@/types/api/auth";

export type UpdateMeRequest = Partial<Pick<AuthUser, "avatarUrl" | "locale" | "name" | "timezone">>;

type GetGoogleAuthorizationInput = {
  clientType?: AuthClientType;
  redirectUri?: string;
  state?: string;
};

export class AuthConfigurationError extends Error {
  constructor(message = "GOOGLE_AUTH_CONFIGURATION_REQUIRED") {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

function getAccessTokenExpiresAt(accessToken: string) {
  try {
    const [, payload] = accessToken.split(".");
    const claims = JSON.parse(globalThis.atob(payload)) as { exp?: number };
    if (claims.exp) {
      return new Date(claims.exp * 1000).toISOString();
    }
  } catch {
    // Fall through to a short local-dev expiry.
  }

  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

function assertValidGoogleAuthorizeUrl(authorizeUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(authorizeUrl);
  } catch {
    throw new AuthConfigurationError();
  }

  const clientId = parsed.searchParams.get("client_id")?.trim();
  const isGoogleAuthorizeUrl = parsed.hostname === "accounts.google.com" && parsed.pathname === "/o/oauth2/v2/auth";

  if (!isGoogleAuthorizeUrl || !clientId || clientId === "CHANGE_ME") {
    throw new AuthConfigurationError();
  }
}

function assertDevAccessTokenLoginAllowed() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN !== "true"
  ) {
    throw new AuthConfigurationError("DEV_ACCESS_TOKEN_LOGIN_DISABLED");
  }
}

async function storeLoginTokenWithSelectedLocale(token: AuthTokenResponse, clientType: AuthClientType) {
  const selectedLocale = readExplicitStoredLocale();
  const tokenToStore =
    selectedLocale && token.user.locale !== selectedLocale
      ? { ...token, user: { ...token.user, locale: selectedLocale } }
      : token;

  if (clientType === "TAURI") {
    await setStoredAuthSessionAndWaitForTauriMirror({ ...tokenToStore, clientType });
  } else {
    setStoredAuthSession({ ...tokenToStore, clientType });
  }

  if (!selectedLocale || token.user.locale === selectedLocale) {
    return tokenToStore;
  }

  try {
    const savedUser = await apiRequest<AuthUser>("/api/me", {
      body: { locale: selectedLocale },
      method: "PATCH",
    });
    updateStoredAuthSessionUser(savedUser);
    return { ...tokenToStore, user: savedUser };
  } catch {
    return tokenToStore;
  }
}

export const authApi = {
  async getGoogleAuthorizationUrl(input: GetGoogleAuthorizationInput = {}) {
    const params = new URLSearchParams();
    params.set("clientType", input.clientType ?? getAuthClientType());
    params.set("redirectUri", input.redirectUri ?? getAuthRedirectUri());
    if (input.state) {
      params.set("state", input.state);
    }

    const response = await apiRequest<GoogleAuthorizeResponse>(`/api/auth/google/authorize?${params.toString()}`, {
      method: "GET",
      skipAuth: true,
      skipAuthRefresh: true,
    });

    assertValidGoogleAuthorizeUrl(response.authorizeUrl);
    return response;
  },

  async callbackGoogle(input: GoogleCallbackRequest) {
    const token = await apiRequest<AuthTokenResponse>("/api/auth/google/callback", {
      body: input,
      method: "POST",
      skipAuth: true,
      skipAuthRefresh: true,
    });
    return storeLoginTokenWithSelectedLocale(token, input.clientType);
  },

  async loginWithDevAccessToken(accessToken: string) {
    assertDevAccessTokenLoginAllowed();
    const user = await apiRequest<AuthUser>("/api/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "GET",
      skipAuth: true,
      skipAuthRefresh: true,
    });
    const expiresAt = getAccessTokenExpiresAt(accessToken);
    const expiresIn = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    const token: AuthTokenResponse = {
      accessToken,
      expiresAt,
      expiresIn,
      refreshToken: `dev-refresh-token:${user.id}`,
      refreshTokenExpiresAt: expiresAt,
      tokenType: "Bearer",
      user,
    };

    return storeLoginTokenWithSelectedLocale(token, getAuthClientType());
  },

  async logout() {
    const refreshToken = getAuthRefreshToken();
    if (!refreshToken) {
      clearStoredAuthSession();
      return null;
    }

    try {
      return await apiRequest<null>("/api/auth/logout", {
        body: {
          clientType: getAuthClientType(),
          refreshToken,
        },
        method: "POST",
      });
    } finally {
      clearStoredAuthSession();
    }
  },

  async refresh() {
    const refreshToken = getAuthRefreshToken();
    if (!refreshToken) {
      clearStoredAuthSession();
      return null;
    }

    const clientType = getAuthClientType();
    const token = await apiRequest<AuthRefreshResponse>("/api/auth/refresh", {
      body: {
        clientType,
        refreshToken,
      },
      method: "POST",
      skipAuth: true,
      skipAuthRefresh: true,
    });
    if (isTauriRuntime()) {
      await setStoredAuthSessionAndWaitForTauriMirror({ ...token, clientType });
    } else {
      setStoredAuthSession({ ...token, clientType });
    }
    return token;
  },

  getMe() {
    return apiRequest<AuthUser>("/api/me");
  },

  updateMe(body: UpdateMeRequest) {
    return apiRequest<AuthUser>("/api/me", {
      body,
      method: "PATCH",
    });
  },

  // 회원 탈퇴 — 서버 처리 후 로컬 세션도 정리한다.
  async withdrawMe() {
    try {
      return await apiRequest<null>("/api/me", {
        method: "DELETE",
      });
    } finally {
      clearStoredAuthSession();
    }
  },
} as const;
